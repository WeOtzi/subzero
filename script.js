document.addEventListener('DOMContentLoaded', () => {
    // --- Element Selectors ---
    const providerSelector = document.getElementById('provider-selector');
    const modelSelector = document.getElementById('model-selector');
    const audioFileInput = document.getElementById('audio-file');
    const transcribeBtn = document.getElementById('transcribe-btn');
    const downloadBtn = document.getElementById('download-btn');
    const transcriptionOutput = document.getElementById('transcription-output');
    const transcriptionStats = document.getElementById('transcription-stats');
    const statusMessage = document.getElementById('status-message');
    const completionSound = document.getElementById('completion-sound');

    // API Key Sections
    const openaiKeySection = document.getElementById('openai-key-section');
    const geminiKeySection = document.getElementById('gemini-key-section');
    const openaiApiKeyInput = document.getElementById('openai-api-key');
    const geminiApiKeyInput = document.getElementById('gemini-api-key');
    const openaiApiKeyStatus = document.getElementById('openai-api-key-status');
    const geminiApiKeyStatus = document.getElementById('gemini-api-key-status');
    
    // --- Data and Constants ---
    const MODELS = {
        openai: [
            { value: 'whisper-1', text: 'Whisper-1 (Recomendado, Más Compatible)' },
            { value: 'gpt-4o', text: 'GPT-4o (Calidad Superior, Requiere Acceso)' }
        ],
        gemini: [
            { value: 'gemini-2.5-pro', text: 'Gemini 2.5 Pro (Máxima Calidad)' },
            { value: 'gemini-2.5-flash', text: 'Gemini 2.5 Flash (Rápido y Eficiente)' },
            { value: 'gemini-2.5-flash-lite-preview-06-17', text: 'Gemini 2.5 Flash Lite (Experimental)' }
        ]
    };

    const PRICING = {
        'whisper-1': 0.006, // $0.006 / minute
        'gpt-4o': 0.015,    // $0.015 / minute (Precio estimado)
        'gemini-2.5-flash': 0, // La facturación de Gemini es compleja y no se basa en el tiempo.
        'gemini-2.5-pro': 0,
        'gemini-2.5-flash-lite-preview-06-17': 0
    };

    // --- Core Functions ---

    function updateUIForProvider(provider) {
        // Toggle API key sections
        openaiKeySection.classList.toggle('hidden', provider !== 'openai');
        geminiKeySection.classList.toggle('hidden', provider !== 'gemini');

        // Populate model selector
        modelSelector.innerHTML = '';
        MODELS[provider].forEach(model => {
            const option = document.createElement('option');
            option.value = model.value;
            option.textContent = model.text;
            modelSelector.appendChild(option);
        });
        
        localStorage.setItem('selectedProvider', provider);
    }

    function saveApiKey(provider) {
        const input = provider === 'openai' ? openaiApiKeyInput : geminiApiKeyInput;
        const status = provider === 'openai' ? openaiApiKeyStatus : geminiApiKeyStatus;
        const key = input.value.trim();
        if (key) {
            localStorage.setItem(`${provider}ApiKey`, key);
            status.textContent = '¡API Key guardada con éxito!';
            setTimeout(() => {
                status.textContent = 'API Key guardada.';
            }, 2000);
        } else {
            status.textContent = `Por favor, introduce una API Key de ${provider}.`;
        }
    }
    
    function loadApiKeys() {
        const openaiKey = localStorage.getItem('openaiApiKey');
        const geminiKey = localStorage.getItem('geminiApiKey');
        if (openaiKey) {
            openaiApiKeyInput.value = openaiKey;
            openaiApiKeyStatus.textContent = 'API Key guardada.';
        }
        if (geminiKey) {
            geminiApiKeyInput.value = geminiKey;
            geminiApiKeyStatus.textContent = 'API Key guardada.';
        }
    }

    // --- Transcription Logic ---

    // OpenAI-specific transcription
    async function handleOpenAITranscription(apiKey, selectedModel, audioFile) {
        const formData = new FormData();
        formData.append('file', audioFile);
        formData.append('model', selectedModel);
        formData.append('response_format', 'verbose_json');
        formData.append('timestamp_granularities[]', 'segment');
        
        const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${apiKey}` },
            body: formData
        });

        const responseData = await response.json();
        if (!response.ok) {
            throw new Error(responseData.error?.message || 'Error desconocido de la API de OpenAI');
        }

        const formatTimestamp = (seconds) => new Date(seconds * 1000).toISOString().substr(11, 12).replace('.', ',');
        const formattedText = responseData.segments.map((segment, index) => {
            return `${index}\n${formatTimestamp(segment.start)} --> ${formatTimestamp(segment.end)}\n${segment.text.trim()}`;
        }).join('\n\n');
        
        return {
            transcription: formattedText,
            duration: responseData.duration,
            cost: ((responseData.duration / 60) * (PRICING[selectedModel] || 0)).toFixed(5)
        };
    }

    // Gemini-specific transcription
    async function handleGeminiTranscription(apiKey, selectedModel, audioFile) {
        const fileToBase64 = (file) => new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result.split(',')[1]);
            reader.onerror = error => reject(error);
        });

        const audioBase64 = await fileToBase64(audioFile);
        
        const geminiPrompt = `Tu misión es generar subtítulos de alta calidad, precisos y apropiados para la audiencia, capturando fielmente el diálogo. Debes numerar el segmento, asignar el timestamp y transcribir lo que dicen. No pares hasta terminar y no te saltes ningún diálogo. El formato de salida exacto debe ser el siguiente:\n\nNÚMERO DE SEGMENTO\nTIMESTAMP_INICIO --> TIMESTAMP_FIN\nTRANSCRIPCIÓN DEL DIÁLOGO`;

        const requestBody = {
            contents: [{ parts: [{ text: geminiPrompt }, { inline_data: { mime_type: 'audio/mp3', data: audioBase64 } }] }],
            generationConfig: { temperature: 0.2 }
        };
        
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        const responseData = await response.json();
        if (!response.ok) {
            throw new Error(responseData.error.message || 'Error desconocido de la API de Gemini');
        }

        const transcription = responseData.candidates[0].content.parts[0].text;
        return {
            transcription: transcription,
            duration: 'N/A', // Gemini API no devuelve la duración del audio
            cost: 'N/A' // La facturación es por tokens, no por tiempo.
        };
    }

    // --- Event Listeners and Initializer ---

    providerSelector.addEventListener('change', () => {
        updateUIForProvider(providerSelector.value);
    });

    document.querySelectorAll('.save-api-key-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            saveApiKey(e.target.dataset.provider);
        });
    });

    transcribeBtn.addEventListener('click', async () => {
        const provider = providerSelector.value;
        const apiKey = (provider === 'openai' ? openaiApiKeyInput.value : geminiApiKeyInput.value).trim();
        const selectedModel = modelSelector.value;
        const audioFile = audioFileInput.files[0];

        if (!apiKey || !audioFile) {
            alert('Por favor, asegúrate de tener una API Key y un archivo de audio seleccionados.');
            return;
        }

        const startTime = performance.now();
        try {
            statusMessage.textContent = 'Subiendo y procesando audio...';
            statusMessage.classList.remove('error');
            transcriptionOutput.textContent = '';
            downloadBtn.classList.add('hidden');
            transcriptionStats.classList.add('hidden');
            
            statusMessage.textContent = `Audio enviado. Esperando respuesta de ${provider}... (puede tardar)`;

            let result;
            if (provider === 'openai') {
                result = await handleOpenAITranscription(apiKey, selectedModel, audioFile);
            } else {
                result = await handleGeminiTranscription(apiKey, selectedModel, audioFile);
            }
            
            completionSound.play();
            const endTime = performance.now();

            transcriptionOutput.textContent = result.transcription;
            statusMessage.textContent = '¡Transcripción completada!';
            downloadBtn.classList.remove('hidden');

            const elapsedTime = ((endTime - startTime) / 1000).toFixed(2);
            const costStat = provider === 'openai' ? `$${result.cost}` : result.cost;
            const durationStat = provider === 'openai' ? `${result.duration} segundos` : result.duration;

            transcriptionStats.innerHTML = `
                <ul>
                    <li><span>Tiempo de proceso:</span> <span>${elapsedTime} segundos</span></li>
                    <li><span>Duración del audio:</span> <span>${durationStat}</span></li>
                    <li><span>Costo estimado (USD):</span> <span>${costStat}</span></li>
                </ul>
            `;
            transcriptionStats.classList.remove('hidden');

        } catch (error) {
            console.error('Ocurrió un error:', error);
            statusMessage.textContent = `Error: ${error.message}`;
            statusMessage.classList.add('error');
        }
    });

    downloadBtn.addEventListener('click', () => {
        const textToSave = transcriptionOutput.textContent;
        if (!textToSave) return;
        const blob = new Blob([textToSave], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'transcripcion.txt';
        document.body.appendChild(a);
a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });

    // Initializer
    function init() {
        const lastProvider = localStorage.getItem('selectedProvider') || 'openai';
        providerSelector.value = lastProvider;
        loadApiKeys();
        updateUIForProvider(lastProvider);
        // La lógica del panel de ajustes de fondo no necesita estar aquí, ya que se mantiene igual.
    }

    init();
     // La lógica del panel de ajustes de fondo se mantiene sin cambios, no es necesario repetirla.
}); 
