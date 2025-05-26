const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const User = require('../models/User'); 

let symptomsListGlobal = [];
let diseaseToSpecializationMapGlobal = {};

const loadChatbotResources = async () => {
    try {
        if (symptomsListGlobal.length === 0) {
            const symptomsData = await fs.readFile(path.join(__dirname, '..', 'ai', 'symptoms_list.json'), 'utf-8');
            symptomsListGlobal = JSON.parse(symptomsData);
        }
        if (Object.keys(diseaseToSpecializationMapGlobal).length === 0) {
            const mapData = await fs.readFile(path.join(__dirname, '..', 'ai', 'disease_to_specialization.json'), 'utf-8');
            diseaseToSpecializationMapGlobal = JSON.parse(mapData);
        }
    } catch (error) {
        console.error("FATAL ERROR: Could not load chatbot resources (symptoms_list.json or disease_to_specialization.json). Chatbot will not work.", error);
    }
};

loadChatbotResources();


const diagnoseSymptoms = async (req, res) => {
    const { userSymptoms } = req.body; 

    if (!userSymptoms || !Array.isArray(userSymptoms) || userSymptoms.length === 0) {
        return res.status(400).json({ message: 'Vui lòng cung cấp danh sách các triệu chứng.' });
    }

    if (symptomsListGlobal.length === 0 || Object.keys(diseaseToSpecializationMapGlobal).length === 0) {
        await loadChatbotResources(); // Thử tải lại nếu chưa có
        if (symptomsListGlobal.length === 0 || Object.keys(diseaseToSpecializationMapGlobal).length === 0) {
             return res.status(500).json({ message: 'Lỗi tài nguyên chatbot phía server. Vui lòng thử lại sau.' });
        }
    }

    // Chuyển tên triệu chứng thành chuỗi cho python script
    const symptomsString = userSymptoms.join(',');

    const pythonScriptPath = path.join(__dirname, '..', 'ai', 'predict_disease.py');
    const pythonExecutable = process.env.PYTHON_EXECUTABLE || 'python'; // Hoặc 'python3'

    const pyProcess = spawn(pythonExecutable, [pythonScriptPath, symptomsString]);

    let predictionResultJson = '';
    let errorOutput = '';

    pyProcess.stdout.on('data', (data) => {
        predictionResultJson += data.toString();
    });

    pyProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
        console.error(`Python Script Error: ${data}`);
    });

    pyProcess.on('close', async (code) => {
        if (code !== 0) {
            console.error(`Python script exited with code ${code}. Error: ${errorOutput}`);
            return res.status(500).json({ message: 'Lỗi từ mô hình chẩn đoán.', error: errorOutput });
        }

        try {
            const prediction = JSON.parse(predictionResultJson);
            if (prediction.error) {
                return res.status(500).json({ message: 'Lỗi từ mô hình chẩn đoán.', error: prediction.error });
            }

            const predictedDisease = prediction.predicted_disease;
            const specialization = diseaseToSpecializationMapGlobal[predictedDisease];

            let suggestedDoctors = [];
            if (specialization) {
                suggestedDoctors = await User.find({
                    role: 'Doctor',
                    specialization: { $regex: specialization, $options: 'i' }
                }).limit(5).select('name avatar specialization clinicInfo averageRating numberOfRatings');
            }

            res.json({
                predictedDisease,
                targetSpecialization: specialization || 'Không xác định',
                suggestedDoctors,
            });

        } catch (parseError) {
            console.error('Error parsing Python script output:', parseError, "Raw output:", predictionResultJson);
            return res.status(500).json({ message: 'Lỗi xử lý kết quả chẩn đoán.', error: predictionResultJson });
        }
    });
};

module.exports = { diagnoseSymptoms, loadChatbotResources };