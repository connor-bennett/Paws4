// content of public/js/conection.js
// to poopulate the result of calculating connections
document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('connectionsForm').addEventListener('submit', function(event) {
        event.preventDefault(); // Prevent the form from submitting through the browser

        var formData = new FormData(this);
        fetch('/connections', {
            method: 'POST',
            body: formData
        }).then(response => response.json())
        .then(data => {
            document.getElementById('result').textContent = 'Connections removed: ' + data.connectionsRemoved;
        }).catch(error => {
            document.getElementById('result').textContent = 'Error: ' + error;
        });
    });
});
