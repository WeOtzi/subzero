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

    // Settings Panel Elements
    const settingsIcon = document.getElementById('settings-icon');
    const settingsPanel = document.getElementById('settings-panel');
    const bgTypeSelector = document.getElementById('bg-type-selector');
    const solidColorControls = document.getElementById('solid-color-controls');
    const gradientControls = document.getElementById('gradient-controls');
    const imageControls = document.getElementById('image-controls');
    
    // Background Control Inputs
    const solidColorInput = document.getElementById('solid-color');
    const gradientTypeInput = document.getElementById('gradient-type');
    const gradientColor1Input = document.getElementById('gradient-color-1');
    const gradientColor2Input = document.getElementById('gradient-color-2');
    const gradientAngleInput = document.getElementById('gradient-angle');
    const imageUploadInput = document.getElementById('image-upload');
    
    // Effect Control Inputs
    const effectBlurInput = document.getElementById('effect-blur');
    const effectBrightnessInput = document.getElementById('effect-brightness');
    const effectContrastInput = document.getElementById('effect-contrast');
    const effectSaturateInput = document.getElementById('effect-saturate');
    const blurValueSpan = document.getElementById('blur-value');
    const brightnessValueSpan = document.getElementById('brightness-value');
    const contrastValueSpan = document.getElementById('contrast-value');
    const saturateValueSpan = document.getElementById('saturate-value');

    // API Key Protection
    const passwordProtection = document.getElementById('password-protection');
    const settingsPasswordInput = document.getElementById('settings-password');
    const unlockKeysBtn = document.getElementById('unlock-keys-btn');
    const apiKeysWrapper = document.getElementById('api-keys-wrapper');
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
        'whisper-1': 0.006, 'gpt-4o': 0.015, 'gemini-2.5-flash': 0, 'gemini-2.5-pro': 0, 'gemini-2.5-flash-lite-preview-06-17': 0
    };

    let bgSettings = {
        bgType: 'image', solid: { color: '#1c1c1e' }, gradient: { type: 'linear-gradient', angle: 135, color1: '#434343', color2: '#000000' },
        image: { url: 'https://images.unsplash.com/photo-1554189097-90d836021d44?q=80&w=2940&auto=format&fit=crop' },
        effects: { blur: 0, brightness: 100, contrast: 100, saturate: 100 }
    };

    // --- Core Functions ---

    function applyStyles() {
        let backgroundStyle = '';
        switch (bgSettings.bgType) {
            case 'solid': backgroundStyle = bgSettings.solid.color; break;
            case 'gradient':
                const grad = bgSettings.gradient;
                backgroundStyle = grad.type === 'linear-gradient' ? `linear-gradient(${grad.angle}deg, ${grad.color1}, ${grad.color2})` : `radial-gradient(circle, ${grad.color1}, ${grad.color2})`;
                break;
            case 'image':
                const imageUrl = bgSettings.image.url.startsWith('data:') ? bgSettings.image.url : `url('${bgSettings.image.url}')`;
                backgroundStyle = `${imageUrl} center center / cover no-repeat`;
                break;
        }
        document.body.style.background = backgroundStyle;
        const effects = bgSettings.effects;
        document.body.style.filter = `blur(${effects.blur}px) brightness(${effects.brightness}%) contrast(${effects.contrast}%) saturate(${effects.saturate}%)`;
    }

    function saveBgSettings() {
        try {
            localStorage.setItem('transcripbotBgSettings', JSON.stringify(bgSettings));
        } catch (e) {
            if (e.name === 'QuotaExceededError') {
                const settingsWithoutImage = { ...bgSettings, image: { url: '' } };
                localStorage.setItem('transcripbotBgSettings', JSON.stringify(settingsWithoutImage));
            }
        }
    }

    function loadBgSettings() {
        const savedSettings = localStorage.getItem('transcripbotBgSettings');
        if (savedSettings) bgSettings = JSON.parse(savedSettings);
        bgTypeSelector.value = bgSettings.bgType;
        solidColorInput.value = bgSettings.solid.color;
        gradientTypeInput.value = bgSettings.gradient.type;
        gradientColor1Input.value = bgSettings.gradient.color1;
        gradientColor2Input.value = bgSettings.gradient.color2;
        gradientAngleInput.value = bgSettings.gradient.angle;
        effectBlurInput.value = bgSettings.effects.blur; blurValueSpan.textContent = bgSettings.effects.blur;
        effectBrightnessInput.value = bgSettings.effects.brightness; brightnessValueSpan.textContent = bgSettings.effects.brightness;
        effectContrastInput.value = bgSettings.effects.contrast; contrastValueSpan.textContent = bgSettings.effects.contrast;
        effectSaturateInput.value = bgSettings.effects.saturate; saturateValueSpan.textContent = bgSettings.effects.saturate;
        updateControlsVisibility(); applyStyles();
    }

    function updateControlsVisibility() {
        solidColorControls.classList.toggle('hidden', bgSettings.bgType !== 'solid');
        gradientControls.classList.toggle('hidden', bgSettings.bgType !== 'gradient');
        imageControls.classList.toggle('hidden', bgSettings.bgType !== 'image');
    }

    function updateUIForProvider(provider) {
        const isUnlocked = !passwordProtection.classList.contains('hidden');
        openaiKeySection.classList.toggle('hidden', provider !== 'openai' || isUnlocked);
        geminiKeySection.classList.toggle('hidden', provider !== 'gemini' || isUnlocked);
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
            setTimeout(() => { status.textContent = 'API Key guardada.'; }, 2000);
        } else {
            status.textContent = `Por favor, introduce una API Key de ${provider}.`;
        }
    }
    
    function loadApiKeys() {
        const preconfiguredKeys = {
            openai: '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',
            gemini: 'AIzaSyArolFYD4PHdgQYq1C91HB_RAYfRKSBn7A'
        };
        ['openai', 'gemini'].forEach(provider => {
            const input = provider === 'openai' ? openaiApiKeyInput : geminiApiKeyInput;
            const status = provider === 'openai' ? openaiApiKeyStatus : geminiApiKeyStatus;
            let key = localStorage.getItem(`${provider}ApiKey`);
            if (!key) { key = preconfiguredKeys[provider]; localStorage.setItem(`${provider}ApiKey`, key); }
            if (key) { input.value = key; status.textContent = 'API Key configurada.'; }
        });
    }

    async function handleOpenAITranscription(apiKey, selectedModel, audioFile) {
        const formData = new FormData();
        formData.append('file', audioFile);
        formData.append('model', selectedModel);
        formData.append('response_format', 'verbose_json');
        formData.append('timestamp_granularities[]', 'segment');
        const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
            method: 'POST', headers: { 'Authorization': `Bearer ${apiKey}` }, body: formData
        });
        const responseData = await response.json();
        if (!response.ok) throw new Error(responseData.error?.message || 'Error desconocido de la API de OpenAI');
        const formatTimestamp = (seconds) => new Date(seconds * 1000).toISOString().substr(11, 12).replace('.', ',');
        return {
            transcription: responseData.segments.map((segment, index) => `${index}\n${formatTimestamp(segment.start)} --> ${formatTimestamp(segment.end)}\n${segment.text.trim()}`).join('\n\n'),
            duration: responseData.duration,
            cost: ((responseData.duration / 60) * (PRICING[selectedModel] || 0)).toFixed(5)
        };
    }

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
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(requestBody)
        });
        const responseData = await response.json();
        if (!response.ok) throw new Error(responseData.error.message || 'Error desconocido de la API de Gemini');
        return {
            transcription: responseData.candidates[0].content.parts[0].text,
            duration: 'N/A', cost: 'N/A'
        };
    }

    // --- Event Listeners & Initializer ---
    settingsIcon.addEventListener('click', () => settingsPanel.classList.toggle('hidden'));
    unlockKeysBtn.addEventListener('click', () => {
        if (settingsPasswordInput.value === 'editores2025') {
            passwordProtection.classList.add('hidden');
            apiKeysWrapper.classList.remove('hidden');
            updateUIForProvider(providerSelector.value);
        } else {
            alert('Contraseña incorrecta.');
        }
    });
    providerSelector.addEventListener('change', () => updateUIForProvider(providerSelector.value));
    document.querySelectorAll('.save-api-key-btn').forEach(button => button.addEventListener('click', (e) => saveApiKey(e.target.dataset.provider)));
    bgTypeSelector.addEventListener('change', (e) => { bgSettings.bgType = e.target.value; updateControlsVisibility(); applyStyles(); saveBgSettings(); });
    solidColorInput.addEventListener('input', (e) => { bgSettings.solid.color = e.target.value; applyStyles(); saveBgSettings(); });
    gradientTypeInput.addEventListener('change', (e) => { bgSettings.gradient.type = e.target.value; applyStyles(); saveBgSettings(); });
    gradientColor1Input.addEventListener('input', (e) => { bgSettings.gradient.color1 = e.target.value; applyStyles(); saveBgSettings(); });
    gradientColor2Input.addEventListener('input', (e) => { bgSettings.gradient.color2 = e.target.value; applyStyles(); saveBgSettings(); });
    gradientAngleInput.addEventListener('input', (e) => { bgSettings.gradient.angle = e.target.value; applyStyles(); saveBgSettings(); });
    imageUploadInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => { bgSettings.image.url = event.target.result; applyStyles(); saveBgSettings(); };
            reader.readAsDataURL(file);
        }
    });
    effectBlurInput.addEventListener('input', (e) => { bgSettings.effects.blur = e.target.value; blurValueSpan.textContent = e.target.value; applyStyles(); saveBgSettings(); });
    effectBrightnessInput.addEventListener('input', (e) => { bgSettings.effects.brightness = e.target.value; brightnessValueSpan.textContent = e.target.value; applyStyles(); saveBgSettings(); });
    effectContrastInput.addEventListener('input', (e) => { bgSettings.effects.contrast = e.target.value; contrastValueSpan.textContent = e.target.value; applyStyles(); saveBgSettings(); });
    effectSaturateInput.addEventListener('input', (e) => { bgSettings.effects.saturate = e.target.value; saturateValueSpan.textContent = e.target.value; applyStyles(); saveBgSettings(); });

    transcribeBtn.addEventListener('click', async () => {
        const provider = providerSelector.value;
        const apiKey = (provider === 'openai' ? openaiApiKeyInput.value : geminiApiKeyInput.value).trim();
        const selectedModel = modelSelector.value;
        const audioFile = audioFileInput.files[0];
        if (!apiKey || !audioFile) { alert('Por favor, asegúrate de tener una API Key y un archivo de audio seleccionados.'); return; }
        const startTime = performance.now();
        try {
            statusMessage.textContent = 'Subiendo y procesando audio...';
            statusMessage.classList.remove('error');
            transcriptionOutput.textContent = '';
            downloadBtn.classList.add('hidden');
            transcriptionStats.classList.add('hidden');
            statusMessage.textContent = `Audio enviado. Esperando respuesta de ${provider}... (puede tardar)`;
            let result = provider === 'openai' ? await handleOpenAITranscription(apiKey, selectedModel, audioFile) : await handleGeminiTranscription(apiKey, selectedModel, audioFile);
            completionSound.play();
            const endTime = performance.now();
            transcriptionOutput.textContent = result.transcription;
            statusMessage.textContent = '¡Transcripción completada!';
            downloadBtn.classList.remove('hidden');
            const elapsedTime = ((endTime - startTime) / 1000).toFixed(2);
            const costStat = provider === 'openai' ? `$${result.cost}` : result.cost;
            const durationStat = provider === 'openai' ? `${result.duration} segundos` : result.duration;
            transcriptionStats.innerHTML = `<ul><li><span>Tiempo de proceso:</span> <span>${elapsedTime} segundos</span></li><li><span>Duración del audio:</span> <span>${durationStat}</span></li><li><span>Costo estimado (USD):</span> <span>${costStat}</span></li></ul>`;
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

    function init() {
        const lastProvider = localStorage.getItem('selectedProvider') || 'openai';
        providerSelector.value = lastProvider;
        loadApiKeys();
        loadBgSettings();
        updateUIForProvider(lastProvider);
    }
    init();
}); 
