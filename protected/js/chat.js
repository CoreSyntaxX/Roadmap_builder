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
    showLoading('AI is thinking...');

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                messages: AppState.messages.map(msg => ({
                    role: msg.role,
                    content: msg.content
                }))
            })
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        const assistantMessage = data.content;

        // Add assistant message
        const messageDiv = addMessage('assistant', assistantMessage);
        
        // Check if this message looks like a roadmap suggestion
        // and add a "Save as Roadmap" button if appropriate
        if (message.toLowerCase().includes('roadmap') || 
            message.toLowerCase().includes('goal') ||
            message.toLowerCase().includes('learn') ||
            message.toLowerCase().includes('become') ||
            message.toLowerCase().includes('start')) {
            
            addSaveAsRoadmapButton(messageDiv, assistantMessage);
        }
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
    
    return messageDiv;
}

/**
 * Add a "Save as Roadmap" button to a chat message
 * @param {HTMLElement} messageDiv - The message container
 * @param {string} messageContent - The message content
 */
function addSaveAsRoadmapButton(messageDiv, messageContent) {
    // Check if button already exists
    if (messageDiv.querySelector('.save-roadmap-btn')) {
        return;
    }
    
    // Create button
    const buttonDiv = document.createElement('div');
    buttonDiv.className = 'save-roadmap-btn-container';
    
    const button = document.createElement('button');
    button.className = 'btn btn-small btn-save-roadmap';
    button.innerHTML = '💾 Save as Roadmap';
    button.title = 'Create a structured roadmap from this conversation';
    
    button.onclick = async () => {
        await saveChatAsRoadmap(messageContent);
    };
    
    buttonDiv.appendChild(button);
    messageDiv.appendChild(buttonDiv);
    
    // Animate button appearance
    buttonDiv.style.opacity = '0';
    buttonDiv.style.transform = 'translateY(10px)';
    buttonDiv.style.transition = 'all 0.3s ease';
    
    setTimeout(() => {
        buttonDiv.style.opacity = '1';
        buttonDiv.style.transform = 'translateY(0)';
    }, 100);
}

/**
 * Save chat conversation as a structured roadmap
 * @param {string} chatContent - The chat content to create roadmap from
 */
async function saveChatAsRoadmap(chatContent) {
    try {
        showLoading('Creating your roadmap...');
        
        // Extract the goal from the conversation
        const lastUserMessage = AppState.messages
            .filter(m => m.role === 'user')
            .pop();
        
        if (!lastUserMessage) {
            throw new Error('No user message found');
        }
        
        const goal = lastUserMessage.content;
        
        // Generate structured roadmap using AI
        if (typeof generateRoadmapWithAI === 'function') {
            const roadmap = await generateRoadmapWithAI(goal, {
                maxSteps: 10,
                includeDuration: true,
                includeResources: true
            });
            
            // Save to Firestore
            if (typeof createRoadmap === 'function') {
                const savedRoadmap = await createRoadmap({
                    title: roadmap.title,
                    description: roadmap.description,
                    nodes: roadmap.nodes,
                    edges: roadmap.edges,
                    isPublic: false
                });
                
                hideLoading();
                showNotification('🎉 Roadmap saved! Check your roadmaps list.');
                
                // Open the roadmap
                if (typeof openRoadmap === 'function') {
                    openRoadmap(savedRoadmap.id);
                }
                
                return savedRoadmap;
            } else {
                throw new Error('Firestore service not available');
            }
        } else {
            throw new Error('Gemini service not available');
        }
    } catch (error) {
        console.error('Error saving roadmap:', error);
        hideLoading();
        showNotification(`Failed to save roadmap: ${error.message}`);
    }
}

// Handle quick prompt clicks from the welcome message
function handleQuickPrompt(event) {
    const button = event.target.closest('.quick-prompt');
    if (!button) return;
    
    const prompt = button.textContent;
    elements.chatInput.value = prompt;
    sendMessage();
}

console.log('🗺️ ROADMAP.AI Chat Module Loaded with Roadmap Integration!');

