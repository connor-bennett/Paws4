// reply to message using chat window
// jquerey functions

$(document).ready(function() {
    // JavaScript for opening chat window
    $('.reply-btn').on('click', function() {
        var recipient = $(this).data('recipient');
        var message = $(this).data('message');
        $('#chat-window .modal-title').text('Chat with ' + recipient);
        $('#reply-message').val(message); // Pre-fill message textarea
        $('#chat-window').modal('show'); // Show chat modal
    });

    // JavaScript for accepting or denying transfer
    $('.accept-btn, .deny-btn').on('click', function() {
        var action = $(this).hasClass('accept-btn') ? 'accept' : 'deny'; // Determine the action based on the clicked button
        var sender = $(this).data('sender'); // Get the sender's username
        var senderId = $(this).data('sender-id'); // Get the sender's ID
        var messageId = $(this).data('message-id'); // Get the message ID (for deny action)
        var petId = $(this).data('pet-id'); // Get the pet ID

        // Perform AJAX request to acceptTransfer endpoint with the appropriate parameters
        $.post('/acceptTransfer', { 
            sender: sender, // Use sender instead of currentRecipient
            senderId: senderId,
            messageId: messageId,
            action: action,
            pet_id: petId // Include the pet ID
        }, function(response) {
            // Handle response
            if (response.success) {
                // Handle success response
                console.log("transfered Pet!...");
                
            } else {
                // Handle error response
                console.error('Error:', response.error);
                // Optionally display an error message to the user
            }
        });
    });


    // JavaScript for sending messages
    $('#send-reply-btn').on('click', function() {
        var message = $('#reply-message').val();
        // Perform AJAX request to send message to the server
        $.post('/sendmessage', {message: message}, function(response) {
            // Handle response and update chat window
            if (response.success) {
                // If the message was sent successfully, update the chat window
                var sender = 'You'; // Assuming the sender is the current user
                var chatMessage = '<li><strong>' + sender + ':</strong> ' + message + '</li>';
                $('#chat-messages').append(chatMessage);
                $('#reply-message').val(''); // Clear the message textarea
            } else {
                // If there was an error sending the message, handle it accordingly
                console.error('Error sending message:', response.error);
                // Optionally, display an error message to the user
            }
        });
    });
});
