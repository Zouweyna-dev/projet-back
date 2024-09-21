window.document.addEventListener('DOMContentLoaded', () => {

  // La fonction io est disponible si la librairie front-end socket.io a été
  // chargée. Cette fonction est documentée ici :
  // @voir : https://socket.io/docs/v4/client-api/#iourl
  const socket = io('http://192.168.1.98');

  // L'objet de type Socket obtenu en front-end est documenté ici :
  // @voir : https://socket.io/docs/v4/client-api/#socket

  socket.on('connect', () => {

    socket.on('caracteristiques-de-votre-carre', (donneesDeCarre) => {
      console.log(donneesDeCarre);

      let  HTMLDivElement = window.document.getElementById(donneesDeCarre.identifiant);

      if (!HTMLDivElement) {
        HTMLDivElement = window.document.createElement('div');
        HTMLDivElement.id = donneesDeCarre.identifiant;
      }

      HTMLDivElement.style.top = donneesDeCarre.haut;
      HTMLDivElement.style.left = donneesDeCarre.gauche;
      HTMLDivElement.style.width = donneesDeCarre.largeur;
      HTMLDivElement.style.height = donneesDeCarre.hauteur;
      HTMLDivElement.style.position = donneesDeCarre.position;
      HTMLDivElement.style.backgroundColor = donneesDeCarre.couleur;

      window.document.body.appendChild(HTMLDivElement);
    })

    window.addEventListener('mousemove', (event) => {
      const souris = {
        x: event.clientX,
        y: event.clientY
      };

      socket.emit('mouvement-souris', souris);

    });

    socket.on('detruire-carre', (leCarreADetruire) => {
      const HTMLDivElement = window.document.getElementById(leCarreADetruire.identifiant);
      if (HTMLDivElement) {
        HTMLDivElement
          .parentNode
          .removeChild(HTMLDivElement)
      }
    })

  });

});