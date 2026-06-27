// src/services/faq.service.js
const fs = require('fs');
const path = require('path');

class FAQService {
    constructor() {
        this.faqs = {
            english: [],
            arabic: [],
            roman_urdu: []
        };
        this.loaded = false;
        this.loadFAQs();
    }

    // ✅ THIS METHOD MUST EXIST
    isQuestion(text) {
        const questionWords = ['what', 'how', 'why', 'when', 'where', 'who', 
                               'is', 'are', 'does', 'do', 'can', 'could',
                               'would', 'should', 'which', 'kya', 'kaise',
                               'کیا', 'کیسے', 'کیوں', 'کب', 'کہاں'];
        const lower = text.toLowerCase();
        return questionWords.some(word => lower.startsWith(word) || lower.includes(' ' + word + ' '));
    }

    // ✅ THIS METHOD MUST EXIST
    async getFAQResponse(question) {
        const language = this.detectLanguage(question);
        const faqs = this.faqs[language] || this.faqs.english;

        if (faqs.length === 0) {
            return { found: false, answer: null, confidence: 0, language: language };
        }

        let bestMatch = null;
        let highestScore = 0;

        for (const faq of faqs) {
            const score = this.getSimilarity(question, faq.question);
            if (score > highestScore && score > 0.1) {
                highestScore = score;
                bestMatch = faq;
            }
        }

        if (bestMatch && highestScore > 0.3) {
            return {
                found: true,
                answer: bestMatch.answer,
                confidence: Math.round(highestScore * 100),
                language: language
            };
        }

        return {
            found: false,
            answer: "I don't have an answer to that question yet. Would you like to speak with a professional?",
            confidence: 0,
            language: language
        };
    }

    // Helper methods
    detectLanguage(text) {
        const arabicPattern = /[\u0600-\u06FF]/;
        const romanUrduPattern = /(?:hai|hoon|hain|tha|thi|the|ko|se|mein|ka|ki|kya|kaise|kya hai)/i;
        
        if (arabicPattern.test(text)) {
            return 'arabic';
        } else if (romanUrduPattern.test(text) && !/[a-zA-Z]{5,}/.test(text)) {
            return 'roman_urdu';
        } else {
            return 'english';
        }
    }

    getSimilarity(text1, text2) {
        const words1 = text1.toLowerCase().split(/\s+/);
        const words2 = text2.toLowerCase().split(/\s+/);
        const common = words1.filter(word => words2.includes(word));
        return common.length / Math.max(words1.length, words2.length);
    }

    async loadFAQs() {
        try {
            const basePath = path.join(__dirname, '../..');
            
            const files = [
                { name: 'faq_results.csv', lang: 'english' },
                { name: 'faq_results_arabic.csv', lang: 'arabic' },
                { name: 'faq_results_roman_urdu.csv', lang: 'roman_urdu' }
            ];

            for (const file of files) {
                const filePath = path.join(basePath, file.name);
                if (fs.existsSync(filePath)) {
                    const content = fs.readFileSync(filePath, 'utf-8');
                    const lines = content.split('\n').filter(line => line.trim());
                    
                    for (let i = 1; i < lines.length; i++) {
                        const parts = lines[i].split(',');
                        if (parts.length >= 2) {
                            this.faqs[file.lang].push({
                                question: parts[0].trim(),
                                answer: parts[1].trim()
                            });
                        }
                    }
                    console.log(`✅ Loaded ${this.faqs[file.lang].length} ${file.lang} FAQs`);
                }
            }

            this.loaded = true;
            
            if (this.faqs.english.length === 0) {
                this.addDefaultFAQs();
            }
        } catch (error) {
            console.error('❌ Error loading FAQs:', error.message);
            this.addDefaultFAQs();
        }
    }

    addDefaultFAQs() {
        this.faqs.english = [
            { question: "What is anxiety?", answer: "Anxiety is a normal response to stress. It can help you stay alert and focused. However, when it becomes excessive, it may interfere with daily life." },
            { question: "What is depression?", answer: "Depression is a mood disorder that causes persistent feelings of sadness and loss of interest." },
            { question: "How does therapy work?", answer: "Therapy involves talking with a trained professional who helps you understand your thoughts, feelings, and behaviors." },
        ];
        console.log('✅ Added default FAQs');
    }
}

// ✅ EXPORT THE CLASS INSTANCE
module.exports = new FAQService();