-- Додати поле cs_cart_url для зберігання оригінальних URL з CS-Cart (301 редиректи)
ALTER TABLE products ADD COLUMN IF NOT EXISTS cs_cart_url TEXT;
