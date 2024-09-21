console.log('Script JS chargé correctement dans la page.');

const myForm = document.getElementById('subscribe');
const notificationMessage = document.getElementById('notificationMessage');

if (myForm) {
    myForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const formData = new FormData(myForm);
        const data = Object.fromEntries(formData);
        console.log('if my form');

        try {
            const response = await fetch('http://localhost/subscribe', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data),
            });

            console.log("body", JSON.stringify(data))

            setTimeout(() => {
                window.location.href = "/api/login";
            }, 2000);

        } catch (err) {
            console.error("Il y a eu un problème avec l'opération fetch: ", err);
        }

    });
} else {
    console.log('Form or Notification Message DOM Element not found');
}