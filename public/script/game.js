
    const ingredients = [
    "Farine", "Sucre", "Beurre", "Œufs", "Lait", "Levure chimique",
    "Chocolat noir", "Crème fraîche", "Vanille", "Fraises", "Citron",
    "Amandes", "Noix de coco", "Crème au beurre", "Poudre d'amandes",
    "Mascarpone", "Café fort", "Cacao en poudre"
    ];

    const recipes = [
    {
        name: "Gâteau au Chocolat",
        ingredients: ["Farine", "Sucre", "Beurre", "Œufs", "Chocolat noir", "Levure chimique"]
    },
    {
        name: "Tarte aux Fraises",
        ingredients: ["Farine", "Beurre", "Sucre", "Œufs", "Crème fraîche", "Fraises"]
    },
    {
        name: "Tiramisu",
        ingredients: ["Mascarpone", "Œufs", "Sucre", "Café fort", "Cacao en poudre"]
    },
    {
        name: "Macarons",
        ingredients: ["Poudre d'amandes", "Sucre", "Œufs", "Crème au beurre"]
    },
    {
        name: "Gâteau au Citron",
        ingredients: ["Farine", "Sucre", "Beurre", "Œufs", "Citron", "Levure chimique"]
    }
    ];

    let currentRecipe;
    let correctIngredients;
    let timer;
    let scores = [0, 0];

    function initGame() {
    currentRecipe = recipes[Math.floor(Math.random() * recipes.length)];
    document.getElementById('recipe').textContent = `Recette: ${currentRecipe.name}`;
    correctIngredients = currentRecipe.ingredients;
    shuffleArray(ingredients);

    const player1Grid = document.getElementById('player1-grid');
    const player2Grid = document.getElementById('player2-grid');
    player1Grid.innerHTML = '';
    player2Grid.innerHTML = '';

    ingredients.forEach(ingredient => {
    const button1 = createIngredientButton(ingredient, 1);
    const button2 = createIngredientButton(ingredient, 2);
    player1Grid.appendChild(button1);
    player2Grid.appendChild(button2);
});

    scores = [0, 0];
    updateScores();
    startTimer();
}

    function createIngredientButton(ingredient, playerNumber) {
    const button = document.createElement('button');
    button.className = 'ingredient';
    button.onclick = () => selectIngredient(ingredient, playerNumber, button);
    button.textContent = ingredient;
    return button;
}

    function selectIngredient(ingredientName, playerNumber, button) {
    const statusElement = document.getElementById(`player${playerNumber}-status`);
    if (correctIngredients.includes(ingredientName)) {
    statusElement.textContent = "Bon choix !";
    statusElement.style.color = "#4caf50";
    scores[playerNumber - 1]++;
    updateScores();
    button.disabled = true;
} else {
    statusElement.textContent = "Mauvais ingrédient !";
    statusElement.style.color = "#f44336";
}

    checkWinCondition();
}

    function updateScores() {
    document.getElementById('player1-score').textContent = `Score: ${scores[0]}`;
    document.getElementById('player2-score').textContent = `Score: ${scores[1]}`;
}

    function checkWinCondition() {
    if (scores[0] === correctIngredients.length || scores[1] === correctIngredients.length) {
    endGame();
}
}

    function startTimer() {
    let timeLeft = 90;
    const timerElement = document.getElementById('time');
    timer = setInterval(() => {
    timeLeft--;
    timerElement.textContent = timeLeft;
    if (timeLeft <= 0) {
    endGame();
}
}, 1000);
}

    function endGame() {
    clearInterval(timer);
    let message;
    if (scores[0] > scores[1]) {
    message = `Le Pâtissier 1 gagne avec un score de ${scores[0]} !`;
} else if (scores[1] > scores[0]) {
    message = `Le Pâtissier 2 gagne avec un score de ${scores[1]} !`;
} else {
    message = `Égalité ! Les deux pâtissiers ont un score de ${scores[0]}.`;
}
    alert(message);
    initGame();
}

    function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
}
}

    window.onload = initGame;
