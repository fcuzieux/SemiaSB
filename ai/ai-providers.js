// ===== APPELS API VERS LES DIFFÉRENTS PROVIDERS IA =====

// Appel SEMIA
async function callSemiaAI(apiKey, model, systemrole, userrole, prompt) {
    const response = await fetch('http://semia:8080/api/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: model,
            messages: [
                { role: "system", content: systemrole },
                { role: "user", content: `${userrole}\n\n${prompt}` }
            ]
        })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || 'Erreur API SEMIA');
    return data.choices[0].message.content;
}

// Appel OpenAI
async function callOpenAI(apiKey, model, systemrole, userrole, prompt) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: model,
            messages: [
                {
                    role: "system",
                    content: `${systemrole}`
                },
                {
                    role: "user",
                    content: `${userrole}\n\n${prompt}`
                }
            ],
        })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || 'Erreur API OpenAI');
    return data.choices[0].message.content;
}

// Appel Mistral
async function callMistral(apiKey, model, systemrole, userrole, prompt) {
    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: model,
            messages: [
                {
                    role: "system",
                    content: `${systemrole}`
                },
                {
                    role: "user",
                    content: `${userrole}\n\n${prompt}`
                }
            ],
            max_tokens: 2000,
            temperature: 0.3
        })
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error?.message || `Erreur API Mistral: ${response.status} \n${systemrole}\n${userrole}\n${prompt}`);
    }
    return data.choices[0].message.content;
}

// Appel Gemini
async function callGemini(apiKey, model, systemrole, userrole, prompt) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            system_instruction: {
                parts: [{ text: systemrole }]
            },
            contents: [{
                role: "user",
                parts: [{ text: `${userrole}\n\n${prompt}` }]
            }]
        })
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error?.message || `Erreur API Gemini: ${response.status}`);
    }

    // Vérifier si la réponse contient du contenu
    if (!data.candidates || data.candidates.length === 0) {
        throw new Error("Gemini n'a pas retourné de réponse. Le contenu a peut-être été filtré.");
    }

    const candidate = data.candidates[0];
    if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
        throw new Error("Réponse vide de Gemini. Le contenu a peut-être été filtré pour des raisons de sécurité.");
    }

    return candidate.content.parts[0].text;
}

// Fonction générique pour appeler le bon provider
async function callAI(provider, apiKey, model, systemrole, userrole, prompt) {
    if (provider === 'semia') {
        return await callSemiaAI(apiKey, model || 'gpt-oss:120b', systemrole, userrole, prompt);
    } else if (provider === 'mistral') {
        return await callMistral(apiKey, model || 'open-mistral-nemo', systemrole, userrole, prompt);
    } else if (provider === 'openai') {
        return await callOpenAI(apiKey, model || 'gpt-4o-mini', systemrole, userrole, prompt);
    } else if (provider === 'gemini') {
        return await callGemini(apiKey, model || 'gemini-1.5-flash', systemrole, userrole, prompt);
    } else if (provider === 'anthropic') {
        throw new Error("L'intégration Anthropic arrive bientôt.");
    } else {
        throw new Error("Fournisseur non supporté.");
    }
}
