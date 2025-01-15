document.addEventListener("DOMContentLoaded", () => {
    const languageSelect = document.getElementById("language-select");
    const contentDiv = document.getElementById("content");

    // Function to load content based on language
    const loadContent = (language) => {
        fetch(`content_${language}.html`)
            .then(response => {
                if (!response.ok) {
                    throw new Error("Network response was not ok");
                }
                return response.text();
            })
            .then(data => {
                contentDiv.innerHTML = data;
            })
            .catch(error => {
                contentDiv.innerHTML = `<p>Error loading content: ${error.message}</p>`;
            });
    };

    // Set default language to English
    loadContent("en");

    // Change content on language selection
    languageSelect.addEventListener("change", (event) => {
        loadContent(event.target.value);
    });
});