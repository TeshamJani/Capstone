document.getElementById('sendOfferButton').addEventListener('click', function() {
  const email = document.getElementById('offerEmail').value;
  if (!email) {
    alert('Please enter a valid email address.');
    return;
  }
  const data = {
    email: email,
    offerId: '<%= loanOffer._id %>'
  };
  fetch('/send-loan-offer', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })
  .then(response => {
    if (response.ok) {
      alert('Offer sent successfully.');
    } else {
      throw new Error('Failed to send the offer.');
    }
  })
  .catch((error) => {
    console.error('Error:', error);
    alert('Failed to send the offer.');
  });
});