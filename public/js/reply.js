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

    // JavaScript for sending messages
    $('#send-reply-btn').on('click', function() {
        var message = $('#reply-message').val();
        // Perform AJAX request to send message to the server
        $.post('/sendmessage', { message: message }, function(response) {
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
