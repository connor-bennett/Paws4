$(document).ready(function() {
    $('#connectionsForm').submit(function(event) {
      event.preventDefault();  // Prevent the default form submission
      var formData = $(this).serialize();  // Serialize the form data for easy sending
  
      $.ajax({
        type: "POST",
        url: "/connections",
        data: formData,
        success: function(data) {
          $('#result').text('Connections Removed: ' + data.connectionsRemoved);
        },
        error: function(xhr, status, error) {
          $('#result').text('Error: ' + xhr.responseText);
        }
      });
    });
  });
  