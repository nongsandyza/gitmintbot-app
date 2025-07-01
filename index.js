// functions/index.js (ตัวอย่าง Firebase Cloud Function)
const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();
const { GoogleGenerativeAI } = require('@google/generative-ai'); // สำหรับ Gemini
// const OpenAI = require('openai'); // สำหรับ ChatGPT

exports.generateAiContent = functions.firestore
  .document('artifacts/{appId}/public/data/ai_generation_requests/{docId}')
  .onCreate(async (snap, context) => {
    const requestData = snap.data();
    const docRef = snap.ref; // Reference to the document in ai_generation_requests

    try {
      const { prompt, aiModel, userApiKey } = requestData;
      let generatedContent = '';

      if (aiModel === 'gemini') {
        // ดึง Gemini API Key จาก Environment Variable ที่ปลอดภัย
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-pro" }); // หรือ gemini-1.5-flash

        const result = await model.generateContent(prompt);
        const response = await result.response;
        generatedContent = response.text();

      } else if (aiModel === 'chatgpt') {
        // สำหรับ ChatGPT: ใช้ userApiKey ที่ส่งมาจาก Frontend หรือ API Key ที่เก็บใน Environment Variable ของ Cloud Function
        // const openai = new OpenAI({ apiKey: userApiKey || process.env.OPENAI_API_KEY });
        // const chatCompletion = await openai.chat.completions.create({
        //   model: "gpt-3.5-turbo",
        //   messages: [{ role: "user", content: prompt }],
        // });
        // generatedContent = chatCompletion.choices[0].message.content;

        // จำลองการตอบกลับสำหรับ ChatGPT
        await new Promise(resolve => setTimeout(resolve, 2000));
        generatedContent = `(ChatGPT จำลองจาก Cloud Function) เนื้อหาสำหรับ "${prompt.substring(0, 50)}..."`;

      } else {
        throw new Error('Unsupported AI model.');
      }

      // อัปเดตเอกสารใน Firestore ด้วยเนื้อหาที่สร้างขึ้นและสถานะ
      await docRef.update({
        status: 'completed',
        generatedContent: generatedContent,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

    } catch (error) {
      console.error("Error generating AI content:", error);
      await docRef.update({
        status: 'failed',
        errorMessage: error.message,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }
  });

// คุณจะต้องมี Cloud Function อีกตัวสำหรับ `posts_queue` เพื่อโพสต์ไปยัง Facebook Graph API
// ซึ่งจะทำงานเมื่อ `status` เป็น 'pending_post'
// exports.postToFacebook = functions.firestore
//   .document('artifacts/{appId}/public/data/posts_queue/{docId}')
//   .onUpdate(async (change, context) => {
//     const newValue = change.after.data();
//     const previousValue = change.before.data();

//     if (newValue.status === 'pending_post' && previousValue.status !== 'pending_post') {
//       // Logic to post to Facebook Graph API
//       // Use Facebook Graph API SDK here
//       // Make sure to handle multiple pages (facebook_page_ids array)
//       // Update status to 'posted' or 'failed' in Firestore
//     }
//   });
