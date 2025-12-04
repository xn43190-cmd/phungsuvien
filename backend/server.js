// server.js

// --- 1. Import thư viện ---
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const fs = require('fs'); // Thêm thư viện đọc file
const path = require('path');
require('dotenv').config();

// --- 2. Khởi tạo App ---
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// --- 3. Cấu hình & Load Dữ Liệu (QUAN TRỌNG) ---
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Biến lưu trữ nội dung dulieu.txt trong RAM server
let knowledgeBase = "";

// Hàm đọc dữ liệu ngay khi Server khởi động
const loadKnowledgeBase = async () => {
    try {
        // CÁCH 1: Nếu file nằm cùng thư mục server (khuyên dùng cho Render/Local)
        // Bạn cần đảm bảo file dulieu.txt đã được upload lên cùng server.js
        const filePath = path.join(__dirname, 'dulieu.txt');
        if (fs.existsSync(filePath)) {
            knowledgeBase = fs.readFileSync(filePath, 'utf8');
            console.log("--> Đã tải dulieu.txt từ local thành công!");
        } else {
            // CÁCH 2: Nếu file vẫn để online (GitHub)
            console.log("--> Không thấy file local, đang tải từ GitHub...");
            const response = await axios.get("https://gist.githubusercontent.com/xn43190-cmd/c4349f2ad8abb1cd7d0809310d5f0e55/raw/b846d9b77d3bce8e8a523096b47d00736ee680bc/dulieu.txt");
            knowledgeBase = response.data;
            console.log("--> Đã tải dulieu.txt từ Online thành công!");
        }
    } catch (error) {
        console.error("Lỗi khi tải dữ liệu kiến thức:", error.message);
    }
};

// Gọi hàm load dữ liệu
loadKnowledgeBase();

// --- 4. API Chat ---
app.post('/api/chat', async (req, res) => {
    if (!GEMINI_API_KEY) {
        return res.status(500).json({ error: 'Chưa cấu hình API Key.' });
    }

    try {
        // Bây giờ Client chỉ cần gửi question, không cần gửi context nữa
        const { question } = req.body;
        
        if (!question) {
            return res.status(400).json({ error: 'Vui lòng nhập câu hỏi.' });
        }

        // Sử dụng model Flash bản chuẩn để thông minh hơn
        const model = "gemini-2.5-flash-lite"; 
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;

        // --- PROMPT KỸ THUẬT MỚI ---
        const prompt = `
        Bạn là một "Phụng Sự Viên Ảo" của Pháp Môn Tâm Linh, một người trợ lý tận tâm, nhẹ nhàng, khiêm cung và đầy lòng trắc ẩn.
        
        Nhiệm vụ của bạn là giải đáp thắc mắc cho các "Sư huynh/Sư tỷ" (người dùng) dựa trên thông tin trong [CƠ SỞ DỮ LIỆU] bên dưới.

        [CƠ SỞ DỮ LIỆU]:
        """
        ${knowledgeBase}
        """

        **HƯỚNG DẪN TRẢ LỜI (BẮT BUỘC):**
        1.  **Phong cách:** Hãy trả lời một cách tự nhiên, mạch lạc, có chủ ngữ vị ngữ, giọng điệu ấm áp và tôn trọng (xưng "Đệ", gọi người dùng là "Sư huynh").
        2.  **Độ chính xác:** Chỉ sử dụng thông tin trong [CƠ SỞ DỮ LIỆU]. Không được bịa đặt.
        3.  **Tổng hợp thông tin:** Nếu câu trả lời nằm rải rác ở nhiều mục, hãy tổng hợp lại thành một câu trả lời hoàn chỉnh, dễ hiểu. Đừng chỉ copy-paste rời rạc. Hãy trình bày thoáng, dùng gạch đầu dòng nếu cần liệt kê.
        4.  **Xử lý Link:** Nếu thông tin có chứa đường dẫn (URL) liên quan, hãy cung cấp link đó để người dùng tham khảo thêm.
        5.  **Không tìm thấy:** Nếu thông tin hoàn toàn không có trong dữ liệu, hãy trả lời nhẹ nhàng: "Dạ, vấn đề này đệ chưa tìm thấy trong tài liệu hiện tại. Mời Sư huynh tra cứu thêm tại mục lục tổng quan: https://mucluc.pmtl.site ạ."

        **Câu hỏi của Sư huynh:** "${question}"
        
        **Phụng Sự Viên trả lời:**
        `;

        const payload = {
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
                temperature: 0.4, // Tăng nhẹ để văn phong mượt mà hơn (0.0 là máy móc, 1.0 là quá sáng tạo)
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 2048,
            }
        };

        const response = await axios.post(apiUrl, payload, {
            headers: { 'Content-Type': 'application/json' }
        });

        const answer = response.data.candidates[0]?.content?.parts[0]?.text || "Đệ xin lỗi, hiện tại đệ chưa thể phản hồi.";
        
        res.json({ answer });

    } catch (error) {
        console.error('API Error:', error.message);
        res.status(500).json({ error: 'Hệ thống đang bận, xin thử lại sau.' });
    }
});

app.listen(PORT, () => {
    console.log(`Server đang chạy tại cổng ${PORT}`);
});
