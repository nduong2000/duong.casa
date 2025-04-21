document.addEventListener('DOMContentLoaded', function() {
    // API endpoint - Update to match the local CAG server port
    const API_URL = 'https://duong.casa/cache'
    
    // Elements
    const chatMessages = document.getElementById('chat-messages');
    const emptyState = document.getElementById('empty-state');
    const messageInput = document.getElementById('message-input');
    const sendButton = document.getElementById('send-button');
    const modelSelect = document.getElementById('model-select');
    const topKInput = document.getElementById('top-k-input');
    const clearBtn = document.getElementById('clear-btn');
    const refreshBtn = document.getElementById('refresh-btn');
    const refreshIndexBtn = document.getElementById('refresh-index-btn');
    const menuToggle = document.getElementById('menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    const questionOptions = document.querySelectorAll('.question-option');
    const startChatBtn = document.getElementById('start-chat-btn');
    const hintButtons = document.querySelectorAll('.hint-button');
    const notification = document.getElementById('notification');
    const useCacheCheckbox = document.getElementById('use-cache-checkbox');
    const clearCacheBtn = document.getElementById('clear-cache-btn');
    const cacheStatsBtn = document.getElementById('cache-stats-btn');
    const cacheStatsModal = document.getElementById('cache-stats-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const clearAllCacheBtn = document.getElementById('clear-all-cache-btn');
    const preloadTopicBtn = document.getElementById('preload-topic-btn');
    const preloadTopicModal = document.getElementById('preload-topic-modal');
    const closePreloadModalBtn = document.getElementById('close-preload-modal-btn');
    const preloadTopicInput = document.getElementById('preload-topic-input');
    const preloadDescriptionInput = document.getElementById('preload-description-input');
    const submitPreloadBtn = document.getElementById('submit-preload-btn');
    const cancelPreloadBtn = document.getElementById('cancel-preload-btn');
    const cacheStatsBtnHeader = document.getElementById('cache-stats-btn-header');
    
    // Cache statistics elements
    const cacheSize = document.getElementById('cache-size');
    const cacheCapacity = document.getElementById('cache-capacity');
    const cacheUtilization = document.getElementById('cache-utilization');
    const cacheHits = document.getElementById('cache-hits');
    const preloadedTopicsList = document.getElementById('preloaded-topics-list');
    
    // State
    let isProcessing = false;
    let chatStarted = false;
    let cacheHitCount = 0;
    
    // Event listeners
    messageInput.addEventListener('input', adjustTextareaHeight);
    messageInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    sendButton.addEventListener('click', sendMessage);
    clearBtn.addEventListener('click', clearChat);
    refreshBtn.addEventListener('click', checkStatus);
    refreshIndexBtn.addEventListener('click', refreshIndex);
    menuToggle.addEventListener('click', toggleSidebar);
    startChatBtn.addEventListener('click', startChat);
    clearCacheBtn.addEventListener('click', clearCache);
    
    // Cache modal event listeners
    cacheStatsBtn.addEventListener('click', showCacheStats);
    cacheStatsBtnHeader.addEventListener('click', showCacheStats);
    closeModalBtn.addEventListener('click', closeCacheModal);
    clearAllCacheBtn.addEventListener('click', clearAllCaches);
    preloadTopicBtn.addEventListener('click', showPreloadModal);
    closePreloadModalBtn.addEventListener('click', closePreloadModal);
    submitPreloadBtn.addEventListener('click', submitPreloadTopic);
    cancelPreloadBtn.addEventListener('click', closePreloadModal);
    
    // Initialize
    fetchModels();
    checkStatus();
    
    // Question options
    questionOptions.forEach(option => {
        option.addEventListener('click', function() {
            const question = this.getAttribute('data-question');
            messageInput.value = question;
            adjustTextareaHeight();
            
            if (window.innerWidth <= 900) {
                toggleSidebar();
            }
            
            // Focus on input
            messageInput.focus();
        });
    });
    
    // Hint buttons
    hintButtons.forEach(button => {
        button.addEventListener('click', function() {
            const hint = this.getAttribute('data-hint');
            
            let template = '';
            
            switch (hint) {
                case 'summarize':
                    template = 'Please summarize the main points from all documents.';
                    break;
                case 'compare':
                    template = 'Compare and contrast the main topics in the documents.';
                    break;
                case 'extract':
                    template = 'Extract the key points from all documents.';    
                break;
            }
            
            messageInput.value = template;
            adjustTextareaHeight();
            messageInput.focus();
        });
    });
    
    function startChat() {
        if (chatStarted) return;
        
        // Remove empty state
        emptyState.remove();
        
        // Add welcome message
        addBotMessage(`👋 Welcome to the Cache Augmented Generation (CAG) System! I'm your AI assistant to help you explore your documents.

This system enhances traditional RAG with advanced caching mechanisms:

1. **Inference Cache**: Stores complete query results for instant retrieval
2. **Topic Preloading**: Prepares answers for common topics in advance
3. **Semantic Matching**: Recognizes variations of the same question
4. **Persistent Caching**: Maintains performance across sessions

You'll notice some responses are delivered almost instantly when they come from cache. Try asking similar questions in different ways to see how the semantic matching works.

How can I help you today?`);
        
        chatStarted = true;
        
        // Focus on input
        messageInput.focus();
    }
    
    function adjustTextareaHeight() {
        messageInput.style.height = 'auto';
        messageInput.style.height = Math.min(messageInput.scrollHeight, 200) + 'px';
    }
    
    function toggleSidebar() {
        sidebar.classList.toggle('visible');
    }
    
    function clearChat() {
        if (isProcessing) return;
        
        chatMessages.innerHTML = '';
        chatStarted = false;
        cacheHitCount = 0;
        
        // Show empty state
        chatMessages.appendChild(emptyState);
        
        showNotification('info', 'Chat cleared');
    }
    
    function refreshIndex() {
        if (isProcessing) return;
        
        refreshIndexBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Refreshing...';
        
        // Call API to refresh index status
        fetch(`${API_URL}/status`)
            .then(response => response.json())
            .then(data => {
                if (data.status === 'online') {
                    showNotification('success', 'Index refreshed successfully');
                } else {
                    showNotification('error', 'System appears to be offline');
                }
            })
            .catch(error => {
                console.error('Error refreshing index:', error);
                showNotification('error', 'Failed to refresh index status');
            })
            .finally(() => {
                refreshIndexBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh Index';
            });
    }
    
    function clearCache() {
        clearCacheBtn.disabled = true;
        
        fetch(`${API_URL}/cache/clear`, {
            method: 'POST'
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showNotification('success', 'Cache cleared successfully');
                cacheHitCount = 0;
            } else {
                showNotification('error', 'Failed to clear cache');
            }
        })
        .catch(error => {
            console.error('Error clearing cache:', error);
            showNotification('error', 'Failed to connect to server');
        })
        .finally(() => {
            clearCacheBtn.disabled = false;
        });
    }
    
    function showCacheStats() {
        updateCacheStats();
        cacheStatsModal.style.display = 'flex';
    }
    
    function closeCacheModal() {
        cacheStatsModal.style.display = 'none';
    }
    
    function showPreloadModal() {
        preloadTopicInput.value = '';
        preloadDescriptionInput.value = '';
        preloadTopicModal.style.display = 'flex';
        preloadTopicInput.focus();
    }
    
    function closePreloadModal() {
        preloadTopicModal.style.display = 'none';
    }
    
    function clearAllCaches() {
        clearAllCacheBtn.disabled = true;
        
        fetch(`${API_URL}/cache/clear`, {
            method: 'POST'
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showNotification('success', 'All caches cleared successfully');
                updateCacheStats();
                cacheHitCount = 0;
            } else {
                showNotification('error', 'Failed to clear caches');
            }
        })
        .catch(error => {
            console.error('Error clearing caches:', error);
            showNotification('error', 'Failed to connect to server');
        })
        .finally(() => {
            clearAllCacheBtn.disabled = false;
        });
    }
    
    function submitPreloadTopic() {
        const topic = preloadTopicInput.value.trim();
        const description = preloadDescriptionInput.value.trim();
        
        if (!topic) {
            showNotification('warning', 'Please enter a topic or question');
            return;
        }
        
        submitPreloadBtn.disabled = true;
        submitPreloadBtn.textContent = 'Preloading...';
        
        fetch(`${API_URL}/preload`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                topic: topic,
                description: description,
                model: modelSelect.value
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showNotification('success', `Topic "${topic}" preloaded successfully`);
                updateCacheStats();
                closePreloadModal();
            } else {
                showNotification('error', `Failed to preload topic: ${data.error}`);
            }
        })
        .catch(error => {
            console.error('Error preloading topic:', error);
            showNotification('error', 'Failed to connect to server');
        })
        .finally(() => {
            submitPreloadBtn.disabled = false;
            submitPreloadBtn.textContent = 'Preload';
        });
    }
    
    function updateCacheStats() {
        fetch(`${API_URL}/cache/stats`)
        .then(response => response.json())
        .then(data => {
            // Update cache statistics
            const inferenceCache = data.inference_cache || {};
            cacheSize.textContent = inferenceCache.size || 0;
            cacheCapacity.textContent = inferenceCache.capacity || 1000;
            cacheUtilization.textContent = inferenceCache.utilization || '0%';
            cacheHits.textContent = cacheHitCount;
            
            // Update preloaded topics list
            const preloadedTopics = data.preloaded_topics || {};
            const topics = preloadedTopics.topics || [];
            
            if (topics.length > 0) {
                preloadedTopicsList.innerHTML = '';
                topics.forEach(topic => {
                    const topicElement = document.createElement('div');
                    topicElement.className = 'topic-item';
                    
                    topicElement.innerHTML = `
                        <div class="topic-text">${topic}</div>
                        <button class="remove-topic" data-topic="${topic}">
                            <i class="fas fa-trash"></i>
                        </button>
                    `;
                    
                    preloadedTopicsList.appendChild(topicElement);
                });
                
                // Add event listeners to remove buttons
                document.querySelectorAll('.remove-topic').forEach(btn => {
                    btn.addEventListener('click', function() {
                        const topic = this.getAttribute('data-topic');
                        removePreloadedTopic(topic);
                    });
                });
            } else {
                preloadedTopicsList.innerHTML = '<div style="text-align: center; color: var(--text-secondary);">No preloaded topics found</div>';
            }
        })
        .catch(error => {
            console.error('Error fetching cache stats:', error);
            showNotification('error', 'Failed to fetch cache statistics');
        });
    }
    
    function removePreloadedTopic(topic) {
        fetch(`${API_URL}/preload/remove`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                topic: topic
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showNotification('success', `Topic "${topic}" removed successfully`);
                updateCacheStats();
            } else {
                showNotification('error', `Failed to remove topic: ${data.error}`);
            }
        })
        .catch(error => {
            console.error('Error removing topic:', error);
            showNotification('error', 'Failed to connect to server');
        });
    }
    
    function sendMessage() {
        if (isProcessing) return;
        
        const message = messageInput.value.trim();
        if (message === '') return;
        
        // Start chat if not started
        if (!chatStarted) {
            startChat();
        }
        
        // Add user message
        addUserMessage(message);
        
        // Clear input
        messageInput.value = '';
        messageInput.style.height = '54px';
        
        // Add loading message
        isProcessing = true;
        sendButton.disabled = true;
        const botMessageElement = addBotMessage('', true);
        
        // Get model and top_k and cache status
        const model = modelSelect.value;
        const topK = parseInt(topKInput.value) || 3;
        const useCache = useCacheCheckbox.checked;
        
        // Call API with cache parameters
        fetch(`${API_URL}/query`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                query: message,
                model: model,
                top_k: topK,
                session_id: 'web-session-' + Date.now(),
                use_context: true,
                intent_extraction: true,
                hybrid_retrieval: true,
                use_cache: useCache
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                updateBotMessage(botMessageElement, `❌ Error: ${data.error}`);
                showNotification('error', data.error);
            } else {
                // Check if this was a cache hit
                const isCacheHit = data.cache_hit || false;
                const preloadedTopic = data.preloaded_topic || null;
                
                if (isCacheHit) {
                    cacheHitCount++;
                }
                
                // Format sources with enhanced information
                let sourcesHtml = '';
                if (data.sources && data.sources.length > 0) {
                    sourcesHtml = `
                        <div class="sources-section">
                            <div class="sources-title">
                                <i class="fas fa-bookmark"></i> Sources (${data.sources.length}):
                            </div>
                            <div class="sources-list">
                                ${data.sources.map((source, index) => {
                                    let scoreHtml = '';
                                    if (source.score !== null && source.score !== undefined && !isNaN(source.score)) {
                                        scoreHtml = `<div class="source-score">Relevance: ${source.score.toFixed(4)}</div>`;
                                    } else {
                                        scoreHtml = `<div class="source-score">Relevance: N/A</div>`;
                                    }
                                    
                                    let snippetHtml = '';
                                    if (source.text_snippet) {
                                        snippetHtml = `<div class="source-snippet">${escapeHtml(source.text_snippet)}</div>`;
                                    }
                                    
                                    return `
                                        <div class="source-item">
                                            <div class="source-item-content">
                                                <div class="source-header">
                                                    <div>${index + 1}. ${source.file_name || 'Unknown'} (${source.file_type || 'Unknown'})</div>
                                                    ${scoreHtml}
                                                </div>
                                                ${snippetHtml}
                                            </div>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        </div>
                    `;
                }
                
                // Add cache indicator if it's a cache hit
                let cacheIndicator = '';
                if (isCacheHit) {
                    if (preloadedTopic) {
                        cacheIndicator = `
                            <div class="cache-indicator">
                                <i class="fas fa-database"></i> Preloaded Topic
                            </div>
                        `;
                    } else {
                        cacheIndicator = `
                            <div class="cache-indicator">
                                <i class="fas fa-bolt"></i> Cache Hit
                            </div>
                        `;
                    }
                }
                
                // Process time info
                let processingInfo = '';
                if (data.processing_time) {
                    processingInfo = `
                        <div class="cache-info">
                            Processing time: ${data.processing_time}s
                        </div>
                    `;
                }
                
                updateBotMessage(botMessageElement, data.response, sourcesHtml, cacheIndicator, processingInfo);
                
                // Add retrieval details if available
                if (data.retrieval_details && data.retrieval_details.approach === "hybrid") {
                    const variationsHtml = `
                        <div class="sources-section">
                            <div class="sources-title">
                                <i class="fas fa-search"></i> Hybrid Retrieval:
                            </div>
                            <div class="sources-list">
                                ${data.retrieval_details.variations.map((variation, index) => {
                                    return `
                                        <div class="source-item">
                                            <div class="source-item-content">
                                                <div class="source-header">
                                                    <div>Query ${index + 1}</div>
                                                </div>
                                                <div class="source-snippet">${escapeHtml(variation)}</div>
                                            </div>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        </div>
                    `;
                    
                    // Append to the message bubble
                    const bubble = botMessageElement.querySelector('.message-bubble');
                    bubble.innerHTML += variationsHtml;
                }
                
                // Show notification about model used
                let responseSource = isCacheHit ? (preloadedTopic ? "preloaded topic" : "cache") : "generated";
                showNotification('info', `Response from ${responseSource} using ${data.model_used}`);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            updateBotMessage(botMessageElement, '❌ Sorry, there was an error connecting to the server. Please try again later.');
            showNotification('error', 'Connection error');
        })
        .finally(() => {
            isProcessing = false;
            sendButton.disabled = false;
        });
    }
    
    function addUserMessage(text) {
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        const messageElement = document.createElement('div');
        messageElement.className = 'message message-user';
        messageElement.innerHTML = `
            <div class="message-content-wrapper">
                <div class="message-bubble">
                    <div class="message-content">
                        <p>${escapeHtml(text)}</p>
                    </div>
                </div>
                <div class="message-avatar">
                    <i class="fas fa-user"></i>
                </div>
            </div>
            <div class="message-timestamp">${timestamp}</div>
        `;
        
        chatMessages.appendChild(messageElement);
        scrollToBottom();
        
        return messageElement;
    }
    
    function addBotMessage(text, isLoading = false) {
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        const messageElement = document.createElement('div');
        messageElement.className = 'message message-bot';
        
        if (isLoading) {
            messageElement.innerHTML = `
                <div class="message-content-wrapper">
                    <div class="message-avatar">
                        <i class="fas fa-robot"></i>
                    </div>
                    <div class="message-bubble">
                        <div class="message-content">
                            <div class="loading-dots">
                                <div class="dot"></div>
                                <div class="dot"></div>
                                <div class="dot"></div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="message-timestamp">${timestamp}</div>
            `;
        } else {
            messageElement.innerHTML = `
                <div class="message-content-wrapper">
                    <div class="message-avatar">
                        <i class="fas fa-robot"></i>
                    </div>
                    <div class="message-bubble">
                        <div class="message-content">
                            ${parseMarkdown(text)}
                        </div>
                    </div>
                </div>
                <div class="message-timestamp">${timestamp}</div>
            `;
        }
        
        chatMessages.appendChild(messageElement);
        scrollToBottom();
        
        return messageElement;
    }
    
    function updateBotMessage(messageElement, text, sourcesHtml = '', cacheIndicator = '', processingInfo = '') {
        const bubble = messageElement.querySelector('.message-bubble');
        const content = messageElement.querySelector('.message-content');
        
        content.innerHTML = parseMarkdown(text);
        
        // Add cache indicator if provided
        if (cacheIndicator) {
            content.innerHTML += cacheIndicator;
        }
        
        // Add processing info if provided
        if (processingInfo) {
            content.innerHTML += processingInfo;
        }
        
        if (sourcesHtml) {
            bubble.innerHTML = content.outerHTML + sourcesHtml;
        }
        
        // Highlight code blocks
        const codeBlocks = messageElement.querySelectorAll('pre code');
        codeBlocks.forEach(block => {
            hljs.highlightElement(block);
        });
        
        scrollToBottom();
    }
    
    function parseMarkdown(text) {
        // Configure marked options
        marked.setOptions({
            highlight: function(code, lang) {
                const language = hljs.getLanguage(lang) ? lang : 'plaintext';
                return hljs.highlight(code, { language }).value;
            },
            breaks: true,
            gfm: true
        });
        
        // Parse and return the markdown
        return marked.parse(text);
    }
    
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    function scrollToBottom() {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    function showNotification(type, message) {
        notification.className = `notification ${type}`;
        
        let iconClass;
        switch (type) {
            case 'success':
                iconClass = 'fa-check-circle';
                break;
            case 'error':
                iconClass = 'fa-exclamation-circle';
                break;
            case 'warning':
                iconClass = 'fa-exclamation-triangle';
                break;
            default:
                iconClass = 'fa-info-circle';
        }
        
        notification.innerHTML = `
            <i class="fas ${iconClass}"></i>
            <div class="notification-text">${message}</div>
        `;
        
        notification.classList.add('visible');
        
        setTimeout(() => {
            notification.classList.remove('visible');
        }, 3000);
    }
    
    function checkStatus() {
        refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        
        fetch(`${API_URL}/status`)
            .then(response => response.json())
            .then(data => {
                if (data.status === 'online') {
                    if (data.index_loaded) {
                        showNotification('success', `System online with ${data.document_count || 0} documents indexed`);
                        
                        // Additional info for embedding model
                        const embedInfo = data.embedding_model ? ` using ${data.embedding_model}` : '';
                        
                        // Update the chat header to show additional info
                        document.querySelector('.chat-title').innerHTML = `ASOP Document Assistant - BAAI/bge-m3<small style="font-size: 0.7em; opacity: 0.7;">(${data.document_count || 0} docs${embedInfo})</small>`;
                    } else {
                        showNotification('warning', 'No documents are indexed yet. Please run setup_rag.py first.');
                    }
                } else {
                    showNotification('error', 'System appears to be offline');
                }
            })
            .catch(error => {
                console.error('Error checking system status:', error);
                showNotification('error', 'Could not connect to the server');
            })
            .finally(() => {
                refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i>';
            });
    }
    
    function fetchModels() {
        fetch(`${API_URL}/models`)
            .then(response => response.json())
            .then(data => {
                modelSelect.innerHTML = '';
                
                if (data.models && data.models.length > 0) {
                    data.models.forEach(model => {
                        const option = document.createElement('option');
                        option.value = model;
                        option.textContent = model;
                        // Set phi4:14b as the default selected option
                        if (model === 'phi4:14b') {
                            option.selected = true;
                        }
                        modelSelect.appendChild(option);
                    });
                    
                    // If phi4:14b isn't in the list, select it manually
                    if (!data.models.includes('phi4:14b')) {
                        const option = document.createElement('option');
                        option.value = 'phi4:14b';
                        option.textContent = 'phi4:14b (Default)';
                        option.selected = true;
                        modelSelect.appendChild(option);
                    }
                } else {
                    // Default option if no models found
                    const option = document.createElement('option');
                    option.value = 'phi4:14b';
                    option.textContent = 'phi4:14b (Default)';
                    option.selected = true;
                    modelSelect.appendChild(option);
                }
            })
            .catch(error => {
                console.error('Error fetching models:', error);
                // Set default option on error
                modelSelect.innerHTML = '<option value="phi4:14b">phi4:14b (Default)</option>';
            });
    }
    
    // Close the cache stats modal when clicking outside of it
    window.addEventListener('click', function(event) {
        if (event.target === cacheStatsModal) {
            closeCacheModal();
        }
        
        if (event.target === preloadTopicModal) {
            closePreloadModal();
        }
    });
    
    // Prevent propagation from the modal content
    document.querySelector('#cache-stats-modal > div').addEventListener('click', function(event) {
        event.stopPropagation();
    });
    
    document.querySelector('#preload-topic-modal > div').addEventListener('click', function(event) {
        event.stopPropagation();
    });
});
