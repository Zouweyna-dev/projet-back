const myForm = document.getElementById('login-form');
const notificationMessage = document.getElementById('notificationMessage');
console.log("tesssst");

if (myForm && notificationMessage) {
    myForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const formData = new FormData(myForm);
        const data = Object.fromEntries(formData);

        try {
            const result = await fetch('http://localhost/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            if (!result.ok) {
                console.log(`Erreur HTTP! statut : ${result.status}`);
                const text = await result.text();
                console.log('Réponse du serveur en texte brut :', text);
            } else {
                const responseBody = await result.json();
                const token = responseBody.token;
                const { userName, email } = responseBody;
                console.log('UserName:', userName);
                console.log('Email:', email);
                console.log('Token:', token);

                if (token) {
                    // Stocker le token dans localStorage
                    window.localStorage.setItem('token', token);
                    window.localStorage.setItem('userName', userName);
                        // Redirection vers la page de jeu si tout est correct
                        window.location.href = '/game'; // Redirection vers la page de jeu
                    }
                else {
                    console.log('Error: No valid response received from the server');
                }
            }
        } catch (err) {
            console.error("Il y a eu un problème avec l'opération fetch: ", err);
        }
    });
} else {
    console.log('Form or Notification Message DOM Element not found');
}
