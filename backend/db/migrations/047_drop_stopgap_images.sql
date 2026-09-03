-- 047 — Remove the loremflickr stopgap category photos: they load slowly (~4s) and
-- return random-quality images, which looks unprofessional. Those categories now show
-- the clean brand ICON instantly (the storefront layers a real photo over the icon when
-- one exists). The curated Unsplash photos on the original categories are kept. Upload
-- real branded product photos via the admin "Catalog images" tool to replace the icons.
SET search_path TO nirmaan, public;

UPDATE nirmaan.mtrl_ctgry_lst_t SET img_url_tx = NULL WHERE img_url_tx LIKE '%loremflickr%';
