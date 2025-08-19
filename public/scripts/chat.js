const chatDiv = document.getElementById("chat");
const questionInput = document.getElementById("question");
const initialMessageDiv = document.getElementById("initial-message");
const loadingIndicator = document.getElementById("loading-indicator");

questionInput.addEventListener("input", function () {
    this.style.height = "auto";
    this.style.height = this.scrollHeight + "px";
});

document.getElementById("send").addEventListener("click", async () => {
    const question = questionInput.value;

    if (question.trim() === "") return;

    if (initialMessageDiv) {
        initialMessageDiv.style.display = "none";
    }
    
    chatDiv.innerHTML += `<div class="message user">${question}</div>`;
    questionInput.value = ""; 
    
    loadingIndicator.style.display = "flex";
    
    const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ question }),
    });

    const data = await response.json();
    
    chatDiv.innerHTML += `<div class="message assistant">${data.answer.answer || "Não entendi."}</div>`;

    loadingIndicator.style.display = "none";

    chatDiv.scrollTop = chatDiv.scrollHeight;
});