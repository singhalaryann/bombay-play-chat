import { OpenAI } from "openai";
import { NextResponse } from "next/server";
import { Blob } from "buffer";
import { File } from "node:buffer";
import axios from "axios";

export const runtime = 'nodejs';

// Initialize OpenAI client with API key from environment
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Store assistant and threads in memory (for demo purposes)
let assistantId = process.env.OPENAI_ASSISTANT_ID || null;
let threadsByUser = {};

// Simple GET endpoint to test if API is working
export async function GET() {
  return NextResponse.json({ status: "API route is working" });
}

// Main POST endpoint that handles chat messages
export async function POST(request) {
  try {
    console.log("🔁 Chat API called");

    // STEP 1: Parse the incoming form data (message + files)
    const formData = await request.formData();
    const message = formData.get("message")?.toString() || "";
    const userId  = formData.get("userId")?.toString()  || "default";

    console.log("📥 Message received:", message);
    console.log("👤 User ID:", userId);

    // STEP 2: Collect any uploaded files from the form data
    const files = [];
    for (const [key, value] of formData.entries()) {
      console.log("🧾 FormData entry:", key);
      // Check if this entry is a file (starts with "file" and is a Blob)
      if (key.startsWith("file") && value instanceof Blob) {
        files.push(value);
        console.log(
          `📂 Accepted file: key=${key}, size=${value.size}, type=${value.type}`
        );
      }
    }
    console.log("🗂️ Files to process:", files.length);

    // STEP 3: Create or use existing OpenAI Assistant with tools
    if (!assistantId) {
      console.log("🛠️ Creating assistant...");
      const assistant = await openai.beta.assistants.create({
        name: "X-Gaming AI Assistant",
        instructions:
          "You are a helpful gaming AI assistant that can analyze data with code_interpreter. When CSV files are uploaded, analyze the data and create visualizations. For questions about user metrics like DAU/WAU/MAU, use the get_metrics function to retrieve accurate data from our database. Focus on gaming industry insights, game development advice, and data analysis.",
        model: "gpt-4o",
        tools: [
          { type: "code_interpreter" }, // Tool for analyzing files and creating charts
          { 
            type: "function", // Custom function for getting metrics from database
            function: {
              name: "get_metrics",
              description: "Get user metrics like DAU, WAU, MAU, and other gaming statistics from our database",
              parameters: {
                type: "object",
                properties: {
                  metric_type: {
                    type: "string",
                    enum: ["dau", "wau", "mau", "retention", "engagement", "statistics"],
                    description: "The type of metric to retrieve"
                  },
                  time_period: {
                    type: "string",
                    description: "Time period for the metrics, e.g., 'past week', 'April', etc."
                  }
                },
                required: ["metric_type"]
              }
            }
          }
        ]
      });
      assistantId = assistant.id;
      console.log("✅ Assistant created:", assistantId);
    } else {
      console.log("✅ Using existing assistant:", assistantId);
    }

    // STEP 4: Create or reuse conversation thread for this user
    if (!threadsByUser[userId]) {
      const thread = await openai.beta.threads.create();
      threadsByUser[userId] = thread.id;
      console.log("🧵 Thread created:", thread.id);
    }
    const threadId = threadsByUser[userId];

    // STEP 5: Upload files to OpenAI if any files were provided
    let attachments = [];
    if (files.length > 0) {
      const fileIds = [];

      for (const incomingBlob of files) {
        // Convert blob to buffer
        const arrayBuffer = await incomingBlob.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Determine file extension based on type or name
        let ext = "txt";
        const fileName = incomingBlob.name || "";
        const isCSV = fileName.toLowerCase().endsWith('.csv') || incomingBlob.type === "text/csv";
        
        if (incomingBlob.type === "application/pdf") {
          ext = "pdf";
        } else if (isCSV) {
          ext = "csv";
        }
        
        // Create a unique filename
        const filename = `uploaded_${Date.now()}.${ext}`;
        console.log(`📤 Preparing upload of: ${filename} with type ${incomingBlob.type}`);

        // Create File object for OpenAI upload
        const fileForUpload = new File([buffer], filename, {
          type: incomingBlob.type || "application/octet-stream"
        });

        // Upload file to OpenAI
        const uploaded = await openai.files.create({
          file: fileForUpload,
          purpose: "assistants",
        });
        console.log("✅ Uploaded file ID:", uploaded.id);
        fileIds.push(uploaded.id);
      }

      // Prepare attachments for the message (assign code_interpreter tool to files)
      attachments = fileIds.map((id) => ({
        file_id: id,
        tools: [{ type: "code_interpreter" }],
      }));
      console.log("📎 Attachments:", attachments);
    }

    // STEP 6: Add user's message to the conversation thread
    console.log("✉️ Sending user message...");
    await openai.beta.threads.messages.create(threadId, {
      role: "user",
      content: message,
      ...(attachments.length > 0 && { attachments }),
    });

    // STEP 7: Run the assistant with STREAMING enabled
    console.log("🚀 Launching assistant run with streaming...");
    const run = await openai.beta.threads.runs.stream(threadId, {
      assistant_id: assistantId,
    });

    // STEP 8: Return a streaming response (NEW - this enables word-by-word display)
    return new Response(
      new ReadableStream({
        async start(controller) {
          try {
            let fullResponse = "";
            let images = [];
            
            // Listen to streaming events from OpenAI
            for await (const event of run) {
              console.log("📡 Stream event:", event.event);
              
              // Handle different types of streaming events
              if (event.event === 'thread.message.delta') {
                // This is a text chunk from the assistant
                const delta = event.data.delta.content?.[0];
                if (delta?.type === 'text' && delta.text?.value) {
                  const textChunk = delta.text.value;
                  
                  // Only send if not already sent
                  controller.enqueue(`data: ${JSON.stringify({
                    type: 'text',
                    content: textChunk
                  })}\n\n`);
                }
              }
              
              // Handle function calling if assistant needs to call get_metrics
              else if (event.event === 'thread.run.requires_action') {
                console.log("🔧 Function call required");
                const toolCalls = event.data.required_action.submit_tool_outputs.tool_calls;
                const toolOutputs = [];
                
                for (const toolCall of toolCalls) {
                  if (toolCall.function.name === "get_metrics") {
                    console.log("📊 Calling get_metrics function");
                    
                    try {
                      const args = JSON.parse(toolCall.function.arguments);
                      
                      // Try to call your Python API for real data
                      const bqResponse = await axios.post("http://127.0.0.1:8696/run_bq_tool", {
                        question: `Get ${args.metric_type} data ${args.time_period ? 'for ' + args.time_period : ''}`
                      }, {
                        headers: { 'Content-Type': 'application/json' },
                        timeout: 5000
                      });
                      
                      toolOutputs.push({
                        tool_call_id: toolCall.id,
                        output: JSON.stringify(bqResponse.data.result)
                      });
                    } catch (error) {
                      console.error("❌ BQ API Error:", error.message);
                      
                      // Return dummy data if API is unavailable
                      toolOutputs.push({
                        tool_call_id: toolCall.id,
                        output: JSON.stringify({
                          message: "API currently unavailable. This is dummy data for testing.",
                          data: [
                            {"date": "2025-01-01", "dau": 1500},
                            {"date": "2025-01-02", "dau": 1750},
                            {"date": "2025-01-03", "dau": 1600}
                          ]
                        })
                      });
                    }
                  }
                }
                
                // Submit function call results back to OpenAI
                if (toolOutputs.length > 0) {
                  await openai.beta.threads.runs.submitToolOutputs(
                    threadId, 
                    event.data.id, 
                    { tool_outputs: toolOutputs }
                  );
                }
              }
              
              // Handle completion and extract any images
              else if (event.event === 'thread.run.completed') {
                console.log("✅ Run completed, checking for images...");
                
                // Get all messages to find any images
                const msgs = await openai.beta.threads.messages.list(threadId);
                const assistantMsg = msgs.data.find((m) => m.role === "assistant") || {};
                
                if (assistantMsg.content) {
                  for (const chunk of assistantMsg.content) {
                    if (chunk.type === "image_file") {
                      try {
                        // Download and convert image to base64
                        const fileId = chunk.image_file.file_id;
                        const imageContent = await openai.files.content(fileId);
                        const buffer = Buffer.from(await imageContent.arrayBuffer());
                        const base64Image = buffer.toString('base64');
                        const imageUrl = `data:image/png;base64,${base64Image}`;
                        images.push(imageUrl);
                      } catch (err) {
                        console.error("Error getting image:", err);
                      }
                    }
                  }
                }
                
                // Send any images to frontend
                if (images.length > 0) {
                  controller.enqueue(`data: ${JSON.stringify({
                    type: 'images',
                    images: images
                  })}\n\n`);
                }
                
                // Send completion signal
                controller.enqueue(`data: ${JSON.stringify({
                  type: 'done'
                })}\n\n`);
              }
              
              // Handle errors
              else if (event.event === 'thread.run.failed') {
                throw new Error('Assistant run failed');
              }
            }
            
            // Close the stream
            controller.close();
            console.log("🏁 Streaming completed");
            
          } catch (error) {
            console.error("❌ Streaming error:", error);
            // Send error to frontend
            controller.enqueue(`data: ${JSON.stringify({
              type: 'error',
              message: error.message
            })}\n\n`);
            controller.close();
          }
        }
      }),
      {
        // Set headers for Server-Sent Events
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        }
      }
    );
    
  } catch (err) {
    // Handle any errors that occur outside the streaming
    const detail = err?.response?.data || err?.response?.statusText || err?.message || "Unknown error";
    console.error("❌ API Error:", detail);
    return NextResponse.json({ error: detail }, { status: 500 });
  }
}