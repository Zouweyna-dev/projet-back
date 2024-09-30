document.getElementById('logout-link').addEventListener('click', async (event) => {
    event.preventDefault();

    const token = localStorage.getItem('token');

    try {
        const response = await fetch('/403', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
        });

        if (response.ok) {
            localStorage.removeItem('token');
            alert("Vous êtes déconnecté.");
            window.location.href = '/login';
        } else {
            console.error('Erreur lors de la déconnexion :', response.status);
        }
    } catch (err) {
        console.error("Il y a eu un problème avec la déconnexion : ", err);
    }
});

