// _bfs.js
// Private BFS module

// Function to perform BFS and calculate distances between users
function bfsDistance(userIDs, friendshipData) {
    const adjacencyList = createAdjacencyList(userIDs, friendshipData);
    const distances = {};

    for (const user of userIDs) {
        distances[user] = bfs(user, adjacencyList);
    }

    return distances;
}

// Function to create an adjacency list from friendship data
function createAdjacencyList(userIDs, friendshipData) {
    const adjacencyList = {};
    for (const user of userIDs) {
        adjacencyList[user] = [];
    }
    for (const friendship of friendshipData) {
        const [user, friend] = friendship.split(":").map(Number);
        adjacencyList[user].push(friend);
    }
    return adjacencyList;
}

// Function to perform BFS from a starting user and calculate distances
function bfs(startUser, adjacencyList) {
    const distances = {};
    const queue = [startUser];
    const visited = new Set();
    let level = 0;

    distances[startUser] = level;

    while (queue.length > 0) {
        const currentLevelSize = queue.length;
        level++;

        for (let i = 0; i < currentLevelSize; i++) {
            const currentUser = queue.shift();
            visited.add(currentUser);

            for (const neighbor of adjacencyList[currentUser]) {
                if (!visited.has(neighbor)) {
                    distances[neighbor] = level;
                    queue.push(neighbor);
                }
            }
        }
    }

    return distances;
}

export default bfsDistance;