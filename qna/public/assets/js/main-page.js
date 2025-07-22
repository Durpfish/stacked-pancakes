/**
 * Main Page JavaScript
 * Handles specific functionality for the main page
 */

document.addEventListener('DOMContentLoaded', function() {
    // Apply background images from data attributes for profile pictures
    document.querySelectorAll('.profile-circle-small').forEach(function(el) {
        const bgImg = el.getAttribute('data-bg-img');
        if (bgImg) {
            el.style.backgroundImage = `url('${bgImg}')`;
        }
    });
    
    // Get all vote links
    const voteLinks = document.querySelectorAll('.vote-link');
    
    // Add click event to each link
    voteLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            const questionId = this.getAttribute('data-question-id');
            const isLoggedIn = this.getAttribute('data-user-logged-in') === 'true';
            
            // Redirect to login if not logged in
            if (!isLoggedIn) {
                if (confirm('You need an account to vote. Would you like to register now?')) {
                    window.location.href = '/register';
                }
                // No redirection if user clicks Cancel - just return and do nothing
                return;
            }
            
            // Send AJAX request to vote API using POST instead of PUT
            fetch(`/questions/${questionId}/vote`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ voteType: 'up' })
            })
            .then(function(response) {
                if (!response.ok) {
                    if (response.status === 401) {
                        window.location.href = '/login';
                        throw new Error('Please log in to vote');
                    }
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(function(data) {
                if (data.success) {
                    // Update the vote count
                    const currentCount = parseInt(link.textContent.trim());
                    
                    // If the vote was removed (toggle), decrease count
                    if (data.voteType === null) {
                        link.textContent = (currentCount - 1).toString();
                        link.classList.remove('voted');
                    } else {
                        // Otherwise, increase count
                        link.textContent = (currentCount + 1).toString();
                        link.classList.add('voted');
                    }
                }
            })
            .catch(function(error) {
                console.error('Error voting on question:', error);
                if (!error.message.includes('log in')) {
                    alert('Error processing vote. Please try again.');
                }
            });
        });
    });
}); 