const typingForm = document.querySelector(".typing-form");
const chatContainer = document.querySelector(".chat-list");
const suggestions = document.querySelectorAll(".suggestion");
const toggleThemeButton = document.querySelector("#theme-toggle-button");
const deleteChatButton = document.querySelector("#delete-chat-button");

// State variables
let userMessage = null;
let isResponseGenerating = false;

// API configuration
const API_KEY = "AIzaSyDO2YVW5g8XgDEnBCH1LEur7SOCAEr4rYk"; // Your API key here
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

// Load theme and chat data from local storage on page load
const loadDataFromLocalstorage = () => {
    const savedChats = localStorage.getItem("saved-chats");
    const isLightMode = (localStorage.getItem("themeColor") === "light_mode");

    // Apply the stored theme
    document.body.classList.toggle("light_mode", isLightMode);
    toggleThemeButton.innerText = isLightMode ? "dark_mode" : "light_mode";

    // Restore saved chats or clear the chat container
    chatContainer.innerHTML = savedChats || '';
    document.body.classList.toggle("hide-header", !!savedChats);

    chatContainer.scrollTo(0, chatContainer.scrollHeight); // Scroll to the bottom
}

// Create a new message element and return it
const createMessageElement = (content, ...classes) => {
    const div = document.createElement("div");
    div.classList.add("message", ...classes);
    div.innerHTML = content;
    return div;
}

// Show typing effect by displaying words one by one
const showTypingEffect = (text, textElement, incomingMessageDiv) => {
    const words = text.split(' ');
    let currentWordIndex = 0;

    const typingInterval = setInterval(() => {
        // Append each word to the text element with a space
        textElement.innerText += (currentWordIndex === 0 ? '' : ' ') + words[currentWordIndex++];
        incomingMessageDiv.querySelector(".icon").classList.add("hide");

        // If all words are displayed
        if (currentWordIndex === words.length) {
            clearInterval(typingInterval);
            isResponseGenerating = false;
            incomingMessageDiv.querySelector(".icon").classList.remove("hide");
            localStorage.setItem("saved-chats", chatContainer.innerHTML); // Save chats to local storage
        }
        chatContainer.scrollTo(0, chatContainer.scrollHeight); // Scroll to the bottom
    }, 75);
}

// Fetch response from the API based on user message
const generateAPIResponse = async (incomingMessageDiv, aiMessage) => {
    const textElement = incomingMessageDiv.querySelector(".text"); // Getting text element

    try {
        // Send a POST request to the API with the user's message and context
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{
                    role: "user",
                    parts: [{ text: aiMessage }]
                }]
            }),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error.message);

        // Get the API response text and remove asterisks from it
        const apiResponse = data.candidates[0].content.parts[0].text.replace(/\*\*(.*?)\*\*/g, '$1');
        showTypingEffect(apiResponse, textElement, incomingMessageDiv); // Show typing effect
    } catch (error) { // Handle error
        isResponseGenerating = false;
        textElement.innerText = error.message;
        textElement.parentElement.closest(".message").classList.add("error");
    } finally {
        incomingMessageDiv.classList.remove("loading");
    }
}

// Show a loading animation while waiting for the API response
const showLoadingAnimation = () => {
  const html = `<div class="message-content">
                  <img class="avatar" src="yuh.jpg" alt="NGGYU">
                  <p class="text"></p>
                  <div class="loading-indicator">
                    <div class="loading-bar"></div>
                    <div class="loading-bar"></div>
                    <div class="loading-bar"></div>
                  </div>
                </div>
                <span onClick="copyMessage(this)" class="icon material-symbols-rounded">content_copy</span>`;

    const incomingMessageDiv = createMessageElement(html, "incoming", "loading");
    chatContainer.appendChild(incomingMessageDiv);

    chatContainer.scrollTo(0, chatContainer.scrollHeight); // Scroll to the bottom
    return incomingMessageDiv; // Return the created element
}

// Copy message text to the clipboard
const copyMessage = (copyButton) => {
    const messageText = copyButton.parentElement.querySelector(".text").innerText;

    navigator.clipboard.writeText(messageText);
    copyButton.innerText = "done"; // Show confirmation icon
    setTimeout(() => copyButton.innerText = "content_copy", 1000); // Revert icon after 1 second
}

// Handle sending outgoing chat messages
const handleOutgoingChat = async () => {
    userMessage = typingForm.querySelector(".typing-input").value.trim() || userMessage;
    if(!userMessage || isResponseGenerating) return; // Exit if there is no message or response is generating

    isResponseGenerating = true;

    const html = `<div class="message-content">
                  <img class="avatar" src="person.png" alt="User avatar">
                  <p class="text"></p>
                </div>`;

    const outgoingMessageDiv = createMessageElement(html, "outgoing");
    outgoingMessageDiv.querySelector(".text").innerText = userMessage;
    chatContainer.appendChild(outgoingMessageDiv);
    
    typingForm.reset(); // Clear input field
    document.body.classList.add("hide-header");
    chatContainer.scrollTo(0, chatContainer.scrollHeight); // Scroll to the bottom
    
    await generateAIResponse(); // Send the message along with notes and tasks context to AI
}

// Get the user's notes and tasks from local storage and create context for AI
const getAIContext = () => {
    let notes = JSON.parse(localStorage.getItem('notes')) || [];
    let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
  
    let taskListString = tasks.map(task => `- ${task.text} (${task.completed ? 'Completed' : 'Pending'})`).join('\n');
  
    let contextString = `Here are the user's notes and tasks:
      
    Notes: 
    ${notes.length > 0 ? notes.join('\n') : 'No notes'}

    Tasks:
    ${tasks.length > 0 ? taskListString : 'No tasks'}

    If the user asks "what are my notes" or "what are my tasks", you must summarize them. if the user's query is not related to their notes or tasks, answer the question normally but more personalized based on their tasks and notes - use vernac.`;
    return contextString;
};


// Send the user's message along with the context to the AI
const generateAIResponse = async () => {
  const aiInstruction = getAIContext();  // Getting the context string
  const aiMessage = `${aiInstruction} ${userMessage}`;  // Combining AI instruction with the user message

  const incomingMessageDiv = showLoadingAnimation();  // Show the loading animation
  await generateAPIResponse(incomingMessageDiv, aiMessage);  // Generate the response from the AI
};

// Toggle between light and dark themes
toggleThemeButton.addEventListener("click", () => {
    const isLightMode = document.body.classList.toggle("light_mode");
    localStorage.setItem("themeColor", isLightMode ? "light_mode" : "dark_mode");
    toggleThemeButton.innerText = isLightMode ? "dark_mode" : "light_mode";
});

// Delete all chats from local storage when button is clicked
deleteChatButton.addEventListener("click", () => {
    if (confirm("Are you sure you want to delete all the chats?")) {
        localStorage.removeItem("saved-chats");
        loadDataFromLocalstorage();
    }
});

// Set userMessage and handle outgoing chat when a suggestion is clicked
suggestions.forEach(suggestion => {
    suggestion.addEventListener("click", () => {
        userMessage = suggestion.querySelector(".text").innerText;
        handleOutgoingChat();
    });
});

// Prevent default form submission and handle outgoing chat
typingForm.addEventListener("submit", (e) => {
    e.preventDefault();
    handleOutgoingChat();
});

loadDataFromLocalstorage();

// Notes and tasks management
let notesList = document.getElementById('notesList');
let taskList = document.getElementById('taskList');

// Load notes from local storage on page load
const loadNotes = () => {
    let notes = JSON.parse(localStorage.getItem('notes')) || [];
    notesList.innerHTML = notes.map((note, index) => `
        <li>
            <span>${note}</span>
            <button class="delete-btn" onclick="deleteNote(this.parentElement, ${index})">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-trash3" viewBox="0 0 16 16">
                <path d="M6.5 1h3a.5.5 0 0 1 .5.5v1H6v-1a.5.5 0 0 1 .5-.5M11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3A1.5 1.5 0 0 0 5 1.5v1H1.5a.5.5 0 0 0 0 1h.538l.853 10.66A2 2 0 0 0 4.885 16h6.23a2 2 0 0 0 1.994-1.84l.853-10.66h.538a.5.5 0 0 0 0-1zm1.958 1-.846 10.58a1 1 0 0 1-.997.92h-6.23a1 1 0 0 1-.997-.92L3.042 3.5zm-7.487 1a.5.5 0 0 1 .528.47l.5 8.5a.5.5 0 0 1-.998.06L5 5.03a.5.5 0 0 1 .47-.53Zm5.058 0a.5.5 0 0 1 .47.53l-.5 8.5a.5.5 0 1 1-.998-.06l.5-8.5a.5.5 0 0 1 .528-.47M8 4.5a.5.5 0 0 1 .5.5v8.5a.5.5 0 0 1-1 0V5a.5.5 0 0 1 .5-.5"/>
                </svg>
            </button>
        </li>
    `).join('');
}

// Load tasks from local storage on page load
const loadTasks = () => {
    let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
    taskList.innerHTML = tasks.map(task => `
        <li>
            <span class="${task.completed ? 'completed' : ''}">${task.text}</span>
            <button class="task-btn" ${task.completed ? 'disabled' : ''} onclick="markComplete(this.parentElement)">
                ${task.completed ? '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-check" viewBox="0 0 16 16"> <path d="M10.97 4.97a.75.75 0 0 1 1.07 1.05l-3.99 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425z"/> </svg>' : '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-check" viewBox="0 0 16 16"> <path d="M10.97 4.97a.75.75 0 0 1 1.07 1.05l-3.99 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425z"/> </svg>'}
            </button>
        </li>
    `).join('');
}

loadNotes();
loadTasks();
// Handle the "Create" button click
const createButton = document.getElementById('createButton');
const popup = document.getElementById('popup');
const closeBtn = document.querySelector('.close-btn');

// Open the popup
createButton.addEventListener('click', () => {
    popup.style.display = 'block';
});

// Close the popup when the close button is clicked
closeBtn.addEventListener('click', () => {
    popup.style.display = 'none';
});

// Close the popup if the user clicks outside of the popup
window.addEventListener('click', (event) => {
    if (event.target === popup) {
        popup.style.display = 'none';
    }
});

// Add a new note
function addNote() {
    let noteInput = document.getElementById('noteInput');
    if (noteInput.value.trim() !== '') {
        let li = document.createElement('li');
        let noteText = document.createElement('span');
        noteText.textContent = noteInput.value;

        // Create the delete button
        let deleteButton = document.createElement('button');
        deleteButton.textContent = 'X';
        deleteButton.classList.add('delete-btn');
        deleteButton.onclick = () => deleteNote(li);

        // Append the delete button and note text to the list item
        li.appendChild(noteText);
        li.appendChild(deleteButton);


        // Append the list item to the notes list
        notesList.appendChild(li);
        noteInput.value = ''; // Clear the input field

        // Save the note to local storage
        let notes = JSON.parse(localStorage.getItem('notes')) || [];
        notes.push(noteText.textContent); // Store the text content
        localStorage.setItem('notes', JSON.stringify(notes));
    } else {
        alert('Please enter a note!');
    }
}


// Delete a specific note
function deleteNote(noteItem, index) {
      // Remove the note from local storage
      let notes = JSON.parse(localStorage.getItem('notes')) || [];
      notes.splice(index, 1); // Remove the note from the array
      localStorage.setItem('notes', JSON.stringify(notes));
  
      // Remove the note element from the DOM
      noteItem.remove();
  }


// Add a new task
function addTask() {
    let taskInput = document.getElementById('taskInput');
    if (taskInput.value.trim() !== '') {
        let li = document.createElement('li');
        let taskText = document.createElement('span');
        taskText.textContent = taskInput.value;
  
        let completeButton = document.createElement('button');
        completeButton.textContent = 'Complete';
        completeButton.classList.add('task-btn');
        completeButton.onclick = () => markComplete(li);
  
        li.appendChild(taskText);
        li.appendChild(completeButton);
        taskList.appendChild(li);
  
        // Save task to local storage
        let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
        tasks.push({ text: taskInput.value, completed: false });
        localStorage.setItem('tasks', JSON.stringify(tasks));
  
        taskInput.value = '';
    } else {
        alert('Please enter a task!');
    }
  }
  
  // Mark task as completed
  function markComplete(taskItem) {
    taskItem.querySelector('span').classList.add('completed');
    taskItem.querySelector('button').disabled = true;
  
    // Update task completion status in local storage
    let tasks = JSON.parse(localStorage.getItem('tasks'));
    let taskIndex = Array.from(taskList.children).indexOf(taskItem);
    tasks[taskIndex].completed = true;
    localStorage.setItem('tasks', JSON.stringify(tasks));
  }
 
 
 