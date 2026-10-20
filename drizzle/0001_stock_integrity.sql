CREATE TRIGGER reserve_product_stock BEFORE INSERT ON order_lines
BEGIN
 SELECT CASE WHEN NEW.qty < 1 OR NEW.price < 1 THEN RAISE(ABORT,'INVALID_LINE') END;
 SELECT CASE WHEN NOT EXISTS (SELECT 1 FROM products p JOIN stores s ON s.id=p.store JOIN suborders sub ON sub.id=NEW.suborder WHERE p.id=NEW.product AND p.store=sub.store AND p.status='active' AND s.status='approved') THEN RAISE(ABORT,'PRODUCT_UNAVAILABLE') END;
 SELECT CASE WHEN (SELECT stock FROM products WHERE id=NEW.product) < NEW.qty THEN RAISE(ABORT,'STOCK_INSUFFICIENT') END;
 UPDATE products SET stock=stock-NEW.qty WHERE id=NEW.product;
END;
--> statement-breakpoint
CREATE TRIGGER restore_product_stock AFTER UPDATE OF status ON suborders
WHEN (NEW.status IN ('cancelled','rejected','returned') AND OLD.status NOT IN ('cancelled','rejected','returned'))
BEGIN
 UPDATE products SET stock=stock+COALESCE((SELECT SUM(qty) FROM order_lines WHERE suborder=NEW.id AND product=products.id),0) WHERE id IN (SELECT product FROM order_lines WHERE suborder=NEW.id);
END;
--> statement-breakpoint
CREATE INDEX idx_products_store_status ON products(store,status);
--> statement-breakpoint
CREATE INDEX idx_stores_owner ON stores(owner);
--> statement-breakpoint
CREATE INDEX idx_orders_buyer_created ON orders(buyer,created_at);
--> statement-breakpoint
CREATE INDEX idx_suborders_store_status ON suborders(store,status);
--> statement-breakpoint
CREATE INDEX idx_order_events_suborder ON order_events(suborder,created_at);
