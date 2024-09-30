const myForm = document.getElementById('login-form');
const notificationMessage = document.getElementById('notificationMessage');
console.log("tesssst");

if (myForm && notificationMessage) {
    myForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const token = window.localStorage.getItem('token');
        const formData = new FormData(myForm);
        const data = Object.fromEntries(formData);

        try {
            const result = await fetch('/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            if (!result.ok) {
                console.log(`Erreur HTTP! statut : ${result.status}`);
                try {
                    const errorData = await result.json(); // Parse directement en JSON
                    console.log('Réponse du serveur en JSON :', errorData);
                    notificationMessage.textContent = errorData.message;
                    notificationMessage.style.color = 'red';
                } catch (err) {
                    // Si la réponse n'est pas au format JSON
                    const text = await result.text();
                    console.log('Réponse du serveur en texte brut :', text);
                    notificationMessage.textContent = "Erreur inconnue";
                }

                if (result.status === 403){

                    window.location.href = '/403';
                }
            } else {
                const responseBody = await result.json();
                const token = responseBody.token;
                const { userName, email } = responseBody;
                console.log('UserName:', userName);
                console.log('Email:', email);
                console.log('Token:', token);

                if (token) {

                    window.localStorage.setItem('token', token);
                    window.localStorage.setItem('userName', userName);
                    window.location.href = '/game';
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
