const menuBtn = document.getElementById("menu-btn");
const navLinks = document.getElementById("nav-links");
const menuBtnIcon = menuBtn.querySelector("i");

function sendHireEmail() {
  const email = 'l.elliottfuller@gmail.com';
  const subject = 'Hire/Contact Request from Portfolio Website';
  const body = 'Hello,\n\nI saw your portfolio website and I am interested in hiring/contacting you for a project.\n\nBest regards,\n[Your Name]';

  window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

document.getElementById('downloadCvBtn').addEventListener('click', function () {
  const link = document.createElement('a');
  link.href = '/assets/MyResume.pdf';
  link.download = 'MyResume.pdf';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
});

document.getElementById('contactMeBtn').addEventListener('click', function () {
  window.location.href = 'mailto:l.elliottfuller@gmail.com';
});

menuBtn.addEventListener("click", (e) => {
  navLinks.classList.toggle("open");

  const isOpen = navLinks.classList.contains("open");
  menuBtnIcon.setAttribute("class", isOpen ? "ri-close-line" : "ri-menu-line");
});

navLinks.addEventListener("click", (e) => {
  navLinks.classList.remove("open");
  menuBtnIcon.setAttribute("class", "ri-menu-line");
});

const scrollRevealOption = {
  distance: "50px",
  origin: "bottom",
  duration: 1000,
};

ScrollReveal().reveal(".header__image img", {
  ...scrollRevealOption,
  origin: "right",
});
ScrollReveal().reveal(".header__content h2", {
  ...scrollRevealOption,
  delay: 500,
});
ScrollReveal().reveal(".header__content h1", {
  ...scrollRevealOption,
  delay: 1000,
});
ScrollReveal().reveal(".header__content h3", {
  ...scrollRevealOption,
  delay: 1500,
});
ScrollReveal().reveal(".header__content p", {
  ...scrollRevealOption,
  delay: 2000,
});
ScrollReveal().reveal(".header__btns", {
  ...scrollRevealOption,
  delay: 2500,
});

ScrollReveal().reveal(".intro__image", {
  ...scrollRevealOption,
  origin: "left",
});
ScrollReveal().reveal(".intro__content .section__subheader", {
  ...scrollRevealOption,
  delay: 500,
});
ScrollReveal().reveal(".intro__content .section__header", {
  ...scrollRevealOption,
  delay: 1000,
});
ScrollReveal().reveal(".intro__description", {
  ...scrollRevealOption,
  delay: 1500,
});
ScrollReveal().reveal(".intro__grid", {
  ...scrollRevealOption,
  delay: 2000,
});
ScrollReveal().reveal(".intro__content h4", {
  ...scrollRevealOption,
  delay: 2500,
});
ScrollReveal().reveal(".intro__flex div", {
  ...scrollRevealOption,
  delay: 3000,
  interval: 500,
});

ScrollReveal().reveal(".journey__grid > div > div", {
  ...scrollRevealOption,
  interval: 500,
});

const mixer = mixitup(".portfolio__grid");

ScrollReveal().reveal(".banner__content .section__header", {
  ...scrollRevealOption,
});
ScrollReveal().reveal(".banner__content p", {
  ...scrollRevealOption,
  delay: 500,
});
ScrollReveal().reveal(".banner__btn", {
  ...scrollRevealOption,
  delay: 1000,
});

const swiper = new Swiper(".swiper", {
  slidesPerView: 2,
  spaceBetween: 50,
  loop: true,

  pagination: {
    el: ".swiper-pagination",
  },
});

ScrollReveal().reveal(".blog__card", {
  ...scrollRevealOption,
  interval: 500,
});
