const ServerAdd = "http://localhost:3000/chat";

document.addEventListener("DOMContentLoaded", function () {
  const styleElement = document.createElement("style");
  styleElement.textContent = `
    /* Chatbot container */
    #chatbot-container {
        font-family: "Roboto", Arial, sans-serif !important;
        position: fixed;
        bottom: 10px; /* Updated to be higher on the page */
        right: 20px;
        background-color: #fff; /* Updated to white background */
        border-radius: 10px; /* Increased border radius */
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        color: #fff; /* Text color for header/nav bar */
        max-width: 360px;
        min-width: 360px;
    }

    #chatbot-toggle{
        background-color: #163F77; 
        border:none;
    }
    
    #toggleicon{
        background-color: #163F77; /* White background color */
        border-radius: 50%;
        padding: 5px;
        color:white;
        font-size:15px;
    }
    
    /* Chatbot form container */
    #chatbot-form-container {
        /* display: flex; */
        flex-direction: column;
        align-items: center;
        height: 350px;
        padding: 30px;
        border-radius: 10px 10px;
        background-color: #ffffff;
        color: #163F77;
        display: none;
    }
    
    #chatbot-form {
        display: flex;
        flex-direction: column;
        align-items: left;
        width: 100%;
        gap: 0.1rem;
    }
    
    #chatbot-form label {
        margin: 10px 0px;
        font-weight: 700;
    }
    
    #chatbot-form input {
        /* margin: 5px 0; */
        padding: 5px;
        padding-left: 12px;
        border: none;
        border-radius: 5px;
        /* width: 90%; */
        height: 35px;
        background-color: #e8eef6;
    }
    
    #chatbot-form button {
        margin-top: 30px;
        padding: 10px 20px;
        color: #fff;
        background-color: #163F77;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        height: 45px;
    }
    
    /* Chatbot content container */
    #chatbot-content-container {
        display: block; /* Make it visible by default */
    }
    
    /* Chatbot header */
    #chatbot-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px 20px;
        cursor: pointer;
        background-color: #163F77;
        border-radius: 10px 10px 0 0; /* Increased border radius */
    }
    
    /* Chatbot window */
    #chatbot-window {
        padding: 10px;
        display: none;
    }
    
    /* User message bubble */
    .user-message div {
        background-color: #163F77;
        color: #fff;
        word-wrap: break-word; /* Add word-wrap to handle long lines */
    }
    
    /* Bot message bubble */
    .bot-message div {
        background-color: #f0f0f0;
        color: #163F77; /* Updated to blue text color */
        word-wrap: break-word; /* Add word-wrap to handle long lines */
        padding: 2px;
    }
    
    /* Chatbot content */
    #chatbot-content {
        height: 335px; /* Increased height */
        overflow-y: auto;
        padding: 10px;
        
    }
    /* Chatbot input */
    #chatbot-input {
        display: flex;
        align-items: center;
        padding: 5px;
        border-radius: 8px;
        background-color: #e0e2ea;
        margin: 10px 10px;
    
    }
    
    /* Chatbot input field */
    #chatbot-text {
        flex: 1;
        padding-left: 12px;
        border: none;
        border-radius: 6px;
        color: black; 
        height: 20px;
        background-color: transparent;
        outline: none;
    }
    
    
    /* Chatbot send button */
    #chatbot-send  {
        border: none;
        font-size: 20px;
        cursor: pointer;
        padding-top: 2px;
        position: relative;
        background-color: transparent;
    
    }
    
    /* User message */
    .user-message {
        display: flex;
        justify-content: flex-end;
        margin: 5px 0;
    }
    
    /* Bot message */
    .bot-message {
        display: flex;
        justify-content: flex-start;
        margin: 8px 0;
    }
    
    /* Chat bubble */
    .user-message div,
    .bot-message div {
        max-width: 70%;
        padding: 12px;
        border-radius: 10px; /* Increased border radius */
    }
    
    /* User message bubble */
    .user-message div {
        background-color: #163F77;
        color: #fff;
    }
    
    /* Bot message bubble */
    .bot-message div {
        background-color: #f0f0f0;
        color: #163F77; /* Updated to blue text color */
    }
    /* typing animation */
.typing-animation {
    display: flex;
    justify-content: flex-start;
    align-items: center;
    margin: 8px 0;
    padding: 10px;
}

.typing-animation .dot-container {
    display: flex;
    align-items: center;
}

.typing-animation .dot {
    height: 8px;
    width: 8px;
    background-color: #555;
    border-radius: 50%;
    margin: 0 4px;
    opacity: 0;
    animation: showDot 1s infinite;
}

@keyframes showDot {
    0%, 100% { opacity: 0; transform: translateY(0); }
    25% { opacity: 1; transform: translateY(-2px); }
    50%, 75% { opacity: 1; transform: translateY(0); }
}


    `;
  let formFilled = false;
  let currentQuestion = 0;
  const questions = [
    {
      prompt:
        "Hello! I'm Nexa, your career counselor. Shall we begin? (Yes/No)",
    },
    { prompt: "What's your name, age, and gender?" },
    { prompt: "What's your age?" },
    { prompt: "What's your gender?" },
    {
      prompt:
        "Could you please tell me about your current educational level? (10th grade/school/O-levels or 12th grade/college)",
    },
    {
      prompt: "Great! Now, could you share the subjects you've been studying?",
    },
    {
      prompt:
        "How would you describe your family's financial background? (Lower-Middle, Middle Class, or Upper-Middle)",
    },
    { prompt: "Share your 3 strengths and 3 areas you'd like to improve?" },
    { prompt: "What do you want to be in 5 years from now?" },
    {
      prompt:
        "Is there anything else you'd like to share that could help us provide you with personalized advice? (Optional)",
    },
  ];
  const userData = {};

  document.head.appendChild(styleElement);
  const fontAwesomeLink = document.createElement("link");
  fontAwesomeLink.rel = "stylesheet";
  fontAwesomeLink.href =
    "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.3/css/all.min.css";
  document.head.appendChild(fontAwesomeLink);

  let formfilled = true;

  const chatbotContainer = document.createElement("div");
  chatbotContainer.id = "chatbot-container";
  chatbotContainer.innerHTML = `
        <div id="chatbot-content-container">
            <div id="chatbot-header">
                <span id="chatbot-title">Let's Chat</span>
                <button id="chatbot-toggle"><i id="toggleicon" class="fas fa-chevron-up"></i></button>
            </div>

            <div id="chatbot-form-container">
                <form id="chatbot-form">
                    <label for="name">Name:</label>
                    <input type="text" id="name" required>
                    <label for="email">Email:</label>
                    <input type="email" id="email" required>
                    <label for="phone">Phone:</label>
                    <input type="tel" id="phone" required>
                    <button type="submit">Start Chat</button>
                </form>
            </div>

            <div id="chatbot-window">
                <div id="chatbot-content">
                    <!-- Chatbot content goes here -->
                </div>
                <div id="chatbot-input">
                    <input type="text" id="chatbot-text" placeholder="Type your message">
                    <button id="chatbot-send"><img width="30" height="30" src="https://img.icons8.com/material-rounded/48/000000/sent.png" alt=""/></button>
                </div>
            </div>
        </div>
        
    `;

  document.body.appendChild(chatbotContainer);
  // document.body.innerHTML = chatbotContainer;

  const chatbotFormContainer = document.getElementById(
    "chatbot-form-container"
  );
  const chatbotForm = document.getElementById("chatbot-form");
  const chatbotContentContainer = document.getElementById(
    "chatbot-content-container"
  );
  const chatbotHeader = document.getElementById("chatbot-header");
  const chatbotWindow = document.getElementById("chatbot-window");
  const chatbotToggle = document.getElementById("chatbot-toggle");
  const chatbotInput = document.getElementById("chatbot-text");
  const chatbotContent = document.getElementById("chatbot-content");
  const chatbotformcontainer = document.getElementById(
    "chatbot-form-container"
  );
  const toggleicon = document.getElementById("toggleicon");

  // Initialize session storage if not already set
  if (!sessionStorage.getItem("formData")) {
    sessionStorage.setItem("formData", JSON.stringify({}));
  }

  if (!sessionStorage.getItem("chatHistory")) {
    sessionStorage.setItem(
      "chatHistory",
      JSON.stringify([
        {
          sender: "bot",
          message:
            "Welcome! I'm your career guide, here to assist you in making informed decisions about your future. How can I help you today?",
        },
      ])
    );
  }

  // Load form data from session storage
  const formData = JSON.parse(sessionStorage.getItem("formData"));
  document.getElementById("name").value = formData.name || "";
  document.getElementById("email").value = formData.email || "";
  document.getElementById("phone").value = formData.phone || "";

  // Load chat history from session storage
  const chatHistory = JSON.parse(sessionStorage.getItem("chatHistory"));
  for (const entry of chatHistory) {
    appendMessage(entry.sender, entry.message);
  }

  let isChatbotOpen = false;

  // Toggle chatbot window
  chatbotHeader.addEventListener("click", function () {
    if (isChatbotOpen) {
      minimizeChatbot();
    } else {
      maximizeChatbot();
    }
  });

  // Close chatbot window
  chatbotToggle.addEventListener("click", function () {
    console.log("chatbotToggle : " + isChatbotOpen);

    if (isChatbotOpen) {
      minimizeChatbot();
    } else {
      maximizeChatbot();
    }
  });

  // Close chatbot window
  toggleicon.addEventListener("click", function () {
    console.log("toggleicon : " + isChatbotOpen);
    if (isChatbotOpen) {
      minimizeChatbot();
    } else {
      maximizeChatbot();
    }
  });

  // Minimize chatbot
  function minimizeChatbot() {
    chatbotWindow.style.display = "none";
    chatbotformcontainer.style.display = "none";
    chatbotToggle.innerHTML =
      '<i id="toggleicon" class="fas fa-chevron-up"></i>';
    isChatbotOpen = false;
  }

  // Maximize chatbot
  function maximizeChatbot() {
    if (!formfilled) {
      chatbotformcontainer.style.display = "flex";
    } else {
      chatbotWindow.style.display = "block";
    }
    chatbotToggle.innerHTML =
      '<i id="toggleicon" class="fas fa-chevron-down"></i>';
    isChatbotOpen = true;
  }

  chatbotForm.addEventListener("submit", function (event) {
    event.preventDefault();
    formfilled = true;
    const name = document.getElementById("name").value.trim();
    if (name !== "") {
      // Save form data to session storage
      const formData = {
        name: name,
        email: document.getElementById("email").value.trim(),
        phone: document.getElementById("phone").value.trim(),
      };
      sessionStorage.setItem("formData", JSON.stringify(formData));

      chatbotForm.style.display = "none";
      chatbotFormContainer.style.display = "none";
      document.getElementById("chatbot-content-container").style.display =
        "block";
      document.getElementById("chatbot-window").style.display = "block";
      // document.getElementById("chatbot-header").textContent = `Chat with ${name}`;
      // chatbotToggle.style.display = "block";
    }
  });

  document
    .getElementById("chatbot-send")
    .addEventListener("click", sendMessage);
  chatbotInput.addEventListener("keyup", function (event) {
    if (event.key === "Enter") {
      sendMessage();
    }
  });

  // Update the send message function to format and send chat history
  async function sendMessage() {
    const query = chatbotInput.value.trim();
    if (query !== "") {
      appendMessage("user", query);
      chatbotInput.value = "";

      // Show typing animation
      //appendTypingAnimation();

      // Handle the conversation flow
      if (!formFilled) {
        handleInitialQuestions(query);
      } else {
        appendTypingAnimation();
        // Send data to backend when all questions are answered
        try {
          const response = await fetch(ServerAdd, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(userData),
          });

          const data = await response.json();
          const botResponse = data.response;

          // Remove typing animation and append bot response to chat history
          removeTypingAnimation();
          appendMessage("bot", botResponse);
        } catch (error) {
          console.error(error);
          removeTypingAnimation();
          appendMessage(
            "bot",
            "I'm sorry, I'm having trouble connecting to the server."
          );
        }
      }
    }
  }

  function handleInitialQuestions(userResponse) {
    if (currentQuestion === 0) {
      if (userResponse.toLowerCase() === "yes") {
        currentQuestion++;
        appendMessage("bot", questions[currentQuestion].prompt);
      } else {
        appendMessage("bot", "Please type 'Yes' to start the conversation.");
      }
    } else if (currentQuestion > 0 && currentQuestion < questions.length - 1) {
      userData[`question${currentQuestion}`] = userResponse;
      currentQuestion++;
      appendMessage(
        "bot",
        questions[currentQuestion].prompt,
        questions[currentQuestion].options
      );
    } else if (currentQuestion === questions.length - 1) {
      userData[`question${currentQuestion}`] = userResponse;
      formFilled = true;
      removeTypingAnimation();
      appendMessage(
        "bot",
        "Thank you for providing all the information. I'll now analyze your answers and provide personalized career advice."
      );
      appendMessage(
        "bot",
        "Now Tell Me How i Can assisst personalized career advice?"
      );
    }
  }

  function appendTypingAnimation() {
    const typingElement = document.createElement("div");
    typingElement.classList.add("typing-animation");

    const dotContainer = document.createElement("div");
    dotContainer.classList.add("dot-container");

    for (let i = 0; i < 3; i++) {
      const dot = document.createElement("span");
      dot.classList.add("dot");
      dot.style.animationDelay = `${i * 0.2}s`; // Delay each dot by 0.2 seconds
      dotContainer.appendChild(dot);
    }

    typingElement.appendChild(dotContainer);
    chatbotContent.appendChild(typingElement);
    chatbotContent.scrollTop = chatbotContent.scrollHeight;
  }

  function removeTypingAnimation() {
    const typingElements = document.querySelectorAll(".typing-animation");
    typingElements.forEach((element) => element.remove());
  }

  function appendMessage(sender, message, options) {
    const chatbotContent = document.getElementById("chatbot-content");

    const messageElement = document.createElement("div");
    messageElement.classList.add(`${sender}-message`);

    const iconElement = document.createElement("i");
    iconElement.classList.add("fas");
    if (sender === "user") {
      iconElement.classList.add("fa-user");
    } else if (sender === "bot") {
      iconElement.classList.add("fa-robot");
    }

    const messageBubble = document.createElement("div");
    messageBubble.style.wordWrap = "break-word";
    messageBubble.style.padding = "12px";
    messageBubble.style.borderRadius = "10px";
    messageBubble.style.maxWidth = "80%";
    messageBubble.innerHTML = message.replace(/\n/g, "<br>");

    messageElement.appendChild(iconElement);
    messageElement.appendChild(messageBubble);

    if (options) {
      const buttonsContainer = document.createElement("div");
      buttonsContainer.classList.add("buttons-container");

      options.forEach((option) => {
        const button = document.createElement("button");
        button.textContent = option.text;
        button.classList.add("chatbot-option-button");
        button.onclick = () => handleInitialQuestions(option.value);
        buttonsContainer.appendChild(button);
      });

      messageElement.appendChild(buttonsContainer);
    }

    chatbotContent.appendChild(messageElement);
    chatbotContent.scrollTop = chatbotContent.scrollHeight;
  }
});
