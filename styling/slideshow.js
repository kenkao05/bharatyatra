// Each state and its images
const stateImages = {
  gujarat: [
    'styling/stateimages/rann-of-kutchh.jpg',
    'styling/stateimages/saputarawide.jpg',
    'styling/stateimages/girwide.jpg'
  ],
  rajasthan: [
    'styling/stateimages/rajasthanbkgd.jpg',
    'styling/stateimages/rajasthanbkgd2.jpg',
  ],
  
  // add more states here...
};

document.addEventListener("DOMContentLoaded", () => {
  const body = document.body;
  const state = body.dataset.state; // read which state page this is
  const header = document.querySelector('.state-header');

  if (state && stateImages[state]) {
    let index = 0;

    function changeBackground() {
      header.style.backgroundImage = `url('${stateImages[state][index]}')`;
      index = (index + 1) % stateImages[state].length;
    }

    changeBackground(); // show first immediately
    setInterval(changeBackground, 5000); // change every 5s
  }
});
