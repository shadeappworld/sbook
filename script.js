const typingForm = document.querySelector(".typing-form");
const chatContainer = document.querySelector(".chat-list");
const suggestions = document.querySelectorAll(".suggestion");
const toggleThemeButton = document.querySelector("#theme-toggle-button");
const deleteChatButton = document.querySelector("#delete-chat-button");

// State variables
let userMessage = null;
let isResponseGenerating = false;
let chatHistory = []; // Store conversation history

// API configuration
const API_KEY = "AIzaSyDO2YVW5g8XgDEnBCH1LEur7SOCAEr4rYk"; // Your API key here
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

// Load theme and chat data from local storage on page load
const loadDataFromLocalstorage = () => {
  const savedChats = localStorage.getItem("saved-chats");
  const isLightMode = localStorage.getItem("themeColor") === "light_mode";

  // Apply the stored theme
  document.body.classList.toggle("light_mode", isLightMode);
  toggleThemeButton.innerText = isLightMode ? "dark_mode" : "light_mode";

  // Restore saved chats or clear the chat container
  chatContainer.innerHTML = savedChats || "";
  document.body.classList.toggle("hide-header", !!savedChats);

  chatContainer.scrollTo(0, chatContainer.scrollHeight); // Scroll to the bottom
};

// Create a new message element and return it
const createMessageElement = (content, ...classes) => {
  const div = document.createElement("div");
  div.classList.add("message", ...classes);
  div.innerHTML = content;
  return div;
};

// Show typing effect by displaying words one by one
const showTypingEffect = (text, textElement, incomingMessageDiv) => {
  const words = text.split(" ");
  let currentWordIndex = 0;

  const typingInterval = setInterval(() => {
    // Append each word to the text element with a space
    textElement.innerText += (currentWordIndex === 0 ? "" : " ") + words[currentWordIndex++];
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
};

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
        
        // Check if data.candidates and its sub-properties exist
         if (
            data.candidates &&
            data.candidates[0] &&
            data.candidates[0].content &&
            data.candidates[0].content.parts &&
            data.candidates[0].content.parts[0] &&
            typeof data.candidates[0].content.parts[0].text === 'string'
            ) {
                const apiResponse = data.candidates[0].content.parts[0].text.replace(/\*\*(.*?)\*\*/g, '$1');
                showTypingEffect(apiResponse, textElement, incomingMessageDiv);
            return apiResponse;
        } else {
            return null;
        }

    } catch (error) { // Handle error
        isResponseGenerating = false;
        textElement.innerText = error.message;
        textElement.parentElement.closest(".message").classList.add("error");
        return null;
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
};

// Copy message text to the clipboard
const copyMessage = (copyButton) => {
  const messageText = copyButton.parentElement.querySelector(".text").innerText;

  navigator.clipboard.writeText(messageText);
  copyButton.innerText = "done"; // Show confirmation icon
  setTimeout(() => (copyButton.innerText = "content_copy"), 1000); // Revert icon after 1 second
};

// Handle sending outgoing chat messages
const handleOutgoingChat = async () => {
  userMessage = typingForm.querySelector(".typing-input").value.trim() || userMessage;
  if (!userMessage || isResponseGenerating) return; // Exit if there is no message or response is generating

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
};

// Define a system instruction for the AI
const getSystemInstruction = () => {
    return `You are a helpful and conversational AI assistant. Your primary goal is to provide assistance with tasks and information while using a personalized vernacular based on their notes and tasks. Respond in a clear and concise way.
    You have the ability to create and delete notes and tasks. If the user asks you to create a note, generate a detailed note on that topic and save it. If the user asks you to delete a note, delete it. If the user asks to create a task, create it and save it. Always update the user with the status of their notes and tasks if they ask.`;
};

// Get the user's notes and tasks from local storage and create context for AI
const getAIContext = (userMessage) => {
  let notes = JSON.parse(localStorage.getItem("notes")) || [];
  let tasks = JSON.parse(localStorage.getItem("tasks")) || [];

  let taskListString = tasks
    .map((task) => `- ${task.text} (${task.completed ? "Completed" : "Pending"})`)
    .join("\n");

    let contextString = "";
    if (userMessage.toLowerCase().includes("what are my notes")) {
      contextString = `
            Notes: 
                ${notes.length > 0 ? notes.join("\n") : "No notes"}`;
                return contextString;
        } else if (userMessage.toLowerCase().includes("what are my tasks")) {
            contextString = `
                Tasks:
                    ${tasks.length > 0 ? taskListString : "No tasks"}`;
            return contextString;
        }else {
            contextString = `Here are the user's notes and tasks. I will summarize them if you ask me.
                Notes: ${notes.length > 0 ? notes.join("\n") : "No notes"}
                Tasks: ${tasks.length > 0 ? taskListString : "No tasks"}`;
        }
  return contextString;
};

// Function to handle note creation
const handleCreateNote = (noteText, aiMessage) => {
    let notes = JSON.parse(localStorage.getItem("notes")) || [];
    notes.push(aiMessage);
    localStorage.setItem("notes", JSON.stringify(notes));
    loadNotes(); // Update DOM
};

// Function to handle note deletion
const handleDeleteNote = (noteText) => {
    let notes = JSON.parse(localStorage.getItem('notes')) || [];
    const index = notes.indexOf(noteText);
    if (index > -1) {
        notes.splice(index, 1);
    }
    localStorage.setItem('notes', JSON.stringify(notes));
    loadNotes(); // Update DOM
}

// Function to handle task creation
const handleCreateTask = (taskText) => {
  let tasks = JSON.parse(localStorage.getItem("tasks")) || [];
  tasks.push({ text: taskText, completed: false });
  localStorage.setItem("tasks", JSON.stringify(tasks));
  loadTasks(); // Update DOM
};

// Send the user's message along with the context to the AI
const generateAIResponse = async () => {
  const systemInstruction = getSystemInstruction();
  const aiContext = getAIContext(userMessage);

  // Incorporate conversation history (if needed)
  const conversationHistory = chatHistory.map((item) => item.content).join("\n");

  const aiMessage = `${systemInstruction}
    
    ${aiContext}

    ${conversationHistory}
    
    User: ${userMessage}`;

  const incomingMessageDiv = showLoadingAnimation(); // Show the loading animation
  const apiResponse = await generateAPIResponse(incomingMessageDiv, aiMessage); // Generate the response from the AI

    const lowerCaseMessage = userMessage.toLowerCase();

  // Handle note/task creation or deletion
    if (lowerCaseMessage.includes("create a note") || lowerCaseMessage.includes("add a note")) {
        const noteMatch = lowerCaseMessage.match(/(?:create|add) a note (?:on|about)?\s*(?:that )?(.*)/i);
        if(noteMatch) {
            const noteText = noteMatch[1].trim();
            if (apiResponse) {
                handleCreateNote(noteText, apiResponse);
            } else {
                // Handle the case where the API did not return a valid response
               const noResponse = 'Could not create the note at the moment, please try again';
               const textElement = incomingMessageDiv.querySelector('.text');
               showTypingEffect(noResponse, textElement, incomingMessageDiv);
            }
         }
    } else if (lowerCaseMessage.includes("delete a note")) {
        const noteMatch = lowerCaseMessage.match(/delete a note (?:on|about)?\s*(?:that )?(.*)/i);
        if(noteMatch){
            const noteText = noteMatch[1].trim();
            handleDeleteNote(noteText);
        }
    }  else if (lowerCaseMessage.includes("create a task") || lowerCaseMessage.includes("add a task")) {
        const taskMatch = lowerCaseMessage.match(/(?:create|add) a task (?:to|for)?\s*(?:that )?(.*)/i);
        if(taskMatch){
            const taskText = taskMatch[1].trim();
            handleCreateTask(taskText);
         }
    }

   // Update chat history
  chatHistory.push({ role: "user", content: userMessage });
    if (apiResponse){
       chatHistory.push({ role: "assistant", content: apiResponse });
    }


  // Limit the chat history to keep it within a reasonable limit
  if (chatHistory.length > 10) {
    chatHistory = chatHistory.slice(-10);
  }
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
suggestions.forEach((suggestion) => {
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
let notesList = document.getElementById("notesList");
let taskList = document.getElementById("taskList");

// Load notes from local storage on page load
const loadNotes = () => {
  let notes = JSON.parse(localStorage.getItem("notes")) || [];
  notesList.innerHTML = notes
    .map(
      (note, index) => `
        <li data-index="${index}">
            <span class="note-text" contenteditable="true" onblur="updateNote(this, ${index})">${note.replace(/\n/g, '<br>')}</span>
            <button class="delete-btn" onclick="deleteNote(this.parentElement)">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-trash3" viewBox="0 0 16 16">
                <path d="M6.5 1h3a.5.5 0 0 1 .5.5v1H6v-1a.5.5 0 0 1 .5-.5M11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3A1.5 1.5 0 0 0 5 1.5v1H1.5a.5.5 0 0 0 0 1h.538l.853 10.66A2 2 0 0 0 4.885 16h6.23a2 2 0 0 0 1.994-1.84l.853-10.66h.538a.5.5 0 0 0 0-1zm1.958 1-.846 10.58a1 1 0 0 1-.997.92h-6.23a1 1 0 0 1-.997-.92L3.042 3.5zm-7.487 1a.5.5 0 0 1 .528.47l.5 8.5a.5.5 0 0 1-.998.06L5 5.03a.5.5 0 0 1 .47-.53Zm5.058 0a.5.5 0 0 1 .47.53l-.5 8.5a.5.5 0 1 1-.998-.06l.5-8.5a.5.5 0 0 1 .528-.47M8 4.5a.5.5 0 0 1 .5.5v8.5a.5.5 0 0 1-1 0V5a.5.5 0 0 1 .5-.5"/>
                </svg>
            </button>
        </li>
    `
    )
    .join("");
};

// Load tasks from local storage on page load
const loadTasks = () => {
  let tasks = JSON.parse(localStorage.getItem("tasks")) || [];
  taskList.innerHTML = tasks
    .map(
      (task, index) => `
        <li data-index="${index}">
            <span class="${task.completed ? "completed" : ""}">${task.text}</span>
            <button class="task-btn" ${task.completed ? "disabled" : ""} onclick="markComplete(this.parentElement)">
                ${
                  task.completed
                    ? '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-check" viewBox="0 0 16 16"> <path d="M10.97 4.97a.75.75 0 0 1 1.07 1.05l-3.99 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425z"/> </svg>'
                    : '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-check" viewBox="0 0 16 16"> <path d="M10.97 4.97a.75.75 0 0 1 1.07 1.05l-3.99 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425z"/> </svg>'
                }
            </button>
        </li>
    `
    )
    .join("");
};

loadNotes();
loadTasks();
// Handle the "Create" button click
const createButton = document.getElementById("createButton");
const popup = document.getElementById("popup");
const closeBtn = document.querySelector(".close-btn");

// Open the popup
createButton.addEventListener("click", () => {
  popup.style.display = "block";
});

// Close the popup when the close button is clicked
closeBtn.addEventListener("click", () => {
  popup.style.display = "none";
});

// Close the popup if the user clicks outside of the popup
window.addEventListener("click", (event) => {
  if (event.target === popup) {
    popup.style.display = "none";
  }
});

// Add a new note
function addNote() {
  let noteInput = document.getElementById("noteInput");
  if (noteInput.value.trim() !== "") {
      let notes = JSON.parse(localStorage.getItem("notes")) || [];
      const noteText = noteInput.value.trim();
    notes.push(noteText);
    localStorage.setItem("notes", JSON.stringify(notes));
    loadNotes()
    noteInput.value = ""; // Clear the input field
    popup.style.display = "none"; // Hide the popup

  } else {
    alert("Please enter a note!");
  }
}

// Delete a specific note
function deleteNote(noteItem) {
    const index = noteItem.getAttribute('data-index');
  // Remove the note from local storage
  let notes = JSON.parse(localStorage.getItem("notes")) || [];
  notes.splice(index, 1); // Remove the note from the array
  localStorage.setItem("notes", JSON.stringify(notes));

  // Remove the note element from the DOM
  noteItem.remove();
  loadNotes()
}

// Add a new task
function addTask() {
  let taskInput = document.getElementById("taskInput");
  if (taskInput.value.trim() !== "") {
    let tasks = JSON.parse(localStorage.getItem("tasks")) || [];
    tasks.push({ text: taskInput.value, completed: false });
    localStorage.setItem("tasks", JSON.stringify(tasks));
      loadTasks()
    taskInput.value = "";
      popup.style.display = "none"; // Hide the popup

  } else {
    alert("Please enter a task!");
  }
}
function updateNote(span, index) {
    let notes = JSON.parse(localStorage.getItem('notes')) || [];
    notes[index] = span.innerHTML.replace(/<br>/g, '\n');
    localStorage.setItem('notes', JSON.stringify(notes));
}


// Mark task as completed
function markComplete(taskItem) {
    const index = taskItem.getAttribute('data-index');
    // Update task completion status in local storage
    let tasks = JSON.parse(localStorage.getItem("tasks"));
    tasks.splice(index, 1); //Remove from the array
    localStorage.setItem("tasks", JSON.stringify(tasks));
    taskItem.remove()
    loadTasks()
}
