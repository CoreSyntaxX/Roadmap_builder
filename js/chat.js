// ===== CHAT FUNCTIONALITY =====
// Note: showChatModal, hideChatModal, handleQuickPrompt are in utils.js
// sendMessage and addMessage are defined below with API integration

async function sendMessage() {
    const message = elements.chatInput.value.trim();

    if (!message) return;

    // Clear input
    elements.chatInput.value = '';

    // Add user message
    addMessage('user', message);

    // Show loading
    showLoading();

    try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'claude-sonnet-4-20250514',
                max_tokens: 1000,
                messages: AppState.messages.map(msg => ({
                    role: msg.role,
                    content: msg.content
                })),
                system: `You are a helpful roadmap generator assistant. Help users create step-by-step roadmaps for their goals.

When creating a roadmap:
1. Start by acknowledging their goal
2. Break it down into clear phases/milestones
3. Provide specific, actionable steps for each phase
4. Include time estimates where appropriate
5. Add tips or resources when relevant
6. Keep the tone motivating and supportive

Format your roadmap with clear sections and use emojis to make it engaging.`
            })
        });

        const data = await response.json();
        const assistantMessage = data.content[0].text;

        addMessage('assistant', assistantMessage);
    } catch (error) {
        console.error('Error:', error);
        addMessage('assistant', '⚠️ Sorry, I encountered an error. Please try again.');
    } finally {
        hideLoading();
    }
}

function addMessage(role, content) {
    // Remove welcome message if this is the first real message
    const welcomeMsg = document.querySelector('.welcome-message');
    if (welcomeMsg && AppState.messages.length === 0) {
        welcomeMsg.remove();
    }

    // Add to state
    AppState.messages.push({ role, content });

    // Create message element
    const messageDiv = document.createElement('div');
    messageDiv.className = `message message-${role}`;

    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    messageContent.textContent = content;

    messageDiv.appendChild(messageContent);
    elements.chatMessages.appendChild(messageDiv);

    // Scroll to bottom
    elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
}

console.log('🗺️ ROADMAP.AI Chat Module Loaded!');

