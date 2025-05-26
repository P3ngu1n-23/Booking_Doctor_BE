# predict_disease.py
import numpy as np
import tensorflow as tf
import json
import sys
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, 'disease_prediction_cnn.h5')
SYMPTOMS_LIST_PATH = os.path.join(BASE_DIR, 'symptoms_list.json')
DISEASES_LIST_PATH = os.path.join(BASE_DIR, 'diseases_list.json')

def load_resources():
    try:
        model = tf.keras.models.load_model(MODEL_PATH)
    except Exception as e:
        print(json.dumps({"error": f"Error loading model: {str(e)}"}), file=sys.stderr)
        sys.exit(1)
        
    try:
        with open(SYMPTOMS_LIST_PATH, 'r', encoding='utf-8') as f:
            symptoms_list = json.load(f)
        with open(DISEASES_LIST_PATH, 'r', encoding='utf-8') as f:
            diseases_list = json.load(f)
    except Exception as e:
        print(json.dumps({"error": f"Error loading symptoms/diseases list: {str(e)}"}), file=sys.stderr)
        sys.exit(1)
        
    return model, symptoms_list, diseases_list

def preprocess_input_symptoms(input_symptoms_names, all_symptoms_list):
    """
    Chuyển đổi danh sách tên triệu chứng đầu vào thành vector 0/1.
    input_symptoms_names: list các tên triệu chứng người dùng nhập.
    all_symptoms_list: list tất cả các triệu chứng theo đúng thứ tự của model.
    """
    symptom_vector = [0] * len(all_symptoms_list)
    for symptom_name in input_symptoms_names:
        try:
            # Tìm index không phân biệt hoa thường và khoảng trắng thừa
            normalized_symptom_name = symptom_name.strip().lower()
            normalized_all_symptoms_list = [s.strip().lower() for s in all_symptoms_list]
            
            idx = normalized_all_symptoms_list.index(normalized_symptom_name)
            symptom_vector[idx] = 1
        except ValueError:
            # Bỏ qua triệu chứng không có trong danh sách, hoặc log lỗi nếu cần
            # print(f"Warning: Symptom '{symptom_name}' not recognized.", file=sys.stderr)
            pass # Bỏ qua triệu chứng không xác định
    return np.array(symptom_vector)


if __name__ == "__main__":
    model, symptoms_list_ordered, diseases_list_ordered = load_resources()

    if len(sys.argv) < 2:
        print(json.dumps({"error": "No symptoms provided. Usage: python predict_disease.py \"symptom1,symptom2,symptom3\""}), file=sys.stderr)
        sys.exit(1)

    # Nhận triệu chứng từ argument dòng lệnh (dưới dạng chuỗi, ngăn cách bởi dấu phẩy)
    # Hoặc bạn có thể đọc từ stdin nếu muốn truyền dữ liệu lớn hơn/phức tạp hơn
    input_symptoms_str = sys.argv[1]
    user_symptoms_names = [s.strip() for s in input_symptoms_str.split(',')]
    
    # Chuyển đổi tên triệu chứng thành vector đầu vào cho model
    input_vector = preprocess_input_symptoms(user_symptoms_names, symptoms_list_ordered)
    
    if len(input_vector) != len(symptoms_list_ordered):
         print(json.dumps({"error": f"Input vector length mismatch. Expected {len(symptoms_list_ordered)}, got {len(input_vector)}"}), file=sys.stderr)
         sys.exit(1)

    # Reshape cho mô hình CNN (batch_size, timesteps, features)
    # Dựa trên notebook của bạn, đầu vào cho Conv1D có dạng (batch_size, features, 1)
    # hoặc (batch_size, timesteps, features_per_timestep)
    # Nếu model của bạn nhận (None, 132, 1) thì reshape như sau:
    input_vector_reshaped = input_vector.reshape(1, len(symptoms_list_ordered), 1)

    try:
        prediction_probabilities = model.predict(input_vector_reshaped, verbose=0) # verbose=0 để không in log của TensorFlow
        predicted_disease_index = np.argmax(prediction_probabilities, axis=1)[0]
        predicted_disease_name = diseases_list_ordered[predicted_disease_index]
        
        # Trả về kết quả dưới dạng JSON qua stdout
        result = {"predicted_disease": predicted_disease_name}
        print(json.dumps(result, ensure_ascii=False))

    except Exception as e:
        print(json.dumps({"error": f"Error during prediction: {str(e)}"}), file=sys.stderr)
        sys.exit(1)