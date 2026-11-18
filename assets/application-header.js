const productMenu = document.querySelector('.product-menu');
  document.addEventListener('click', event => {
    if (!productMenu.contains(event.target) || event.target.closest('.product-menu-panel a, .product-menu-panel button')) {
      productMenu.open = false;
    }
  });
  productMenu.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || !productMenu.open) return;
    const contact = event.target.closest('.product-contact[open]');
    const section = contact || productMenu;
    section.open = false;
    section.querySelector('summary').focus();
  });
