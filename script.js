const preview = document.getElementById('preview');
        const results = document.getElementById('results');
        const IMGBB_API_KEY = 'f64065e8f138233c7c253ab24893db72';
        const GROQ_API_KEY = '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';

        function capturePhoto() {
            navigator.mediaDevices.getUserMedia({ video: true })
                .then(stream => {
                    const video = document.createElement('video');
                    video.srcObject = stream;
                    video.play();

                    const canvas = document.createElement('canvas');
                    video.addEventListener('loadedmetadata', () => {
                        canvas.width = video.videoWidth;
                        canvas.height = video.videoHeight;
                        canvas.getContext('2d').drawImage(video, 0, 0);
                        preview.src = canvas.toDataURL('image/jpeg');
                        preview.style.display = 'block';
                        stream.getTracks().forEach(track => track.stop());
                        uploadToImgbb(preview.src);
                    });
                })
                .catch(err => {
                    console.error('Error accessing camera:', err);
                    alert('Camera access denied. Please use file upload instead.');
                });
        }

        function handleFileUpload(event) {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    preview.src = e.target.result;
                    preview.style.display = 'block';
                    uploadToImgbb(e.target.result);
                };
                reader.readAsDataURL(file);
            }
        }

        async function uploadToImgbb(imageData) {
            try {
                const formData = new FormData();
                const blob = await fetch(imageData).then(res => res.blob());
                formData.append('image', blob);

                const response = await fetch(`https://api.imgbb.com/1/upload?key=f64065e8f138233c7c253ab24893db72`, {
                    method: 'POST',
                    body: formData
                });
                
                const data = await response.json();
                if (data.success) {
                    const imageUrl = data.data.url;
                    analyzeImage(imageUrl);
                } else {
                    throw new Error('Image upload failed');
                }
            } catch (error) {
                console.error('Error uploading to imgbb:', error);
                alert('Failed to upload image. Please try again.');
            }
        }

        async function analyzeImage(imageUrl) {
            try {
                const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer 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`
                    },
                    body: JSON.stringify({
                        messages: [{
                            role: "user",
                            content: [{
                                type: "text",
                                text: "Give calories of each item in this image in this below JSON format only\n {items:[{item_name:name of item, total_calories:in gm, total_protien:in gm , toal_carbs: in gm ,toal_fats:in gm},...]}"
                            }, {
                                type: "image_url",
                                image_url: {
                                    url: imageUrl
                                }
                            }]
                        }],
                        model: "llama-3.2-90b-vision-preview",
                        temperature: 0.25,
                        max_completion_tokens: 1024,
                        top_p: 1,
                        stream: false,
                        response_format: {
                            type: "json_object"
                        },
                        stop: null
                    })
                });

                const data = await response.json();
                const content = data.choices[0].message.content;
                
                // Since the content is already a JSON string, parse it directly
                const nutritionData = typeof content === 'string' ? JSON.parse(content) : content;
                displayResults(nutritionData);
            } catch (error) {
                console.error('Error analyzing image:', error);
                alert('Failed to analyze image. Showing dummy data.');
                displayResults({
                    items: [
                        { item_name: "Unknown Food", total_calories: "200", total_protien: "10", toal_carbs: "20", toal_fats: "8" }
                    ]
                });
            }
        }

        function displayResults(data) {
            results.innerHTML = '';
            data.items.forEach((food, index) => {
                const card = document.createElement('div');
                card.className = 'card';
                card.style.animationDelay = `${index * 0.1}s`;
                card.innerHTML = `
                    <h3>${food.item_name}</h3>
                    <p><span class="calorie-count">${food.total_calories} kcal</span></p>
                    <p>Protein: ${food.total_protien ?? food.total_protein ?? food['total protein'] ?? '0'}g</p>
                    <p>Carbs: ${food.total_carbs}g</p>
                    <p>Fat: ${food.total_fats}g</p>
                `;
                results.appendChild(card);
            });
        }