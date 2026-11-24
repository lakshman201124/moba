-- Menu update from the printed menu dated 2026-11-05 (MOBA_Menu_Full_261105).
-- New dish: Korean Cinnabon with Ice Cream, K-Desserts → Cakes & Bakes, ₹289.
--
-- Safe to run more than once. It inserts nothing when:
--   • the dish is already in K-Desserts (visible or hidden), or
--   • the desserts category / cakes group doesn't exist yet (a fresh database
--     before seed.sql runs; the seed carries this dish itself).
--
-- sort_order follows staff_save_dish: one past the highest in the category, so it
-- lands last in Cakes & Bakes, right after Burnt Butter Toast, as on the printed menu.
-- diet stays null like every other dessert (the printed dessert page has no veg marks).
-- The bump_menu_version trigger tells open phones to refresh.

insert into public.dishes (category_id, group_id, name, description, price, diet, spice, sort_order)
select c.id,
       g.id,
       'Korean Cinnabon with Ice Cream',
       'A buttery cinnamon roll caramelised on the pan, finished with honey, creamy ice cream, and toasted pine nuts.',
       289,
       null,
       0,
       coalesce((select max(d.sort_order) + 1 from public.dishes d where d.category_id = c.id), 0)
  from public.categories c
  join public.category_groups g on g.category_id = c.id and g.slug = 'cakes'
 where c.slug = 'desserts'
   and not exists (
         select 1 from public.dishes d
          where d.category_id = c.id
            and lower(btrim(d.name)) = 'korean cinnabon with ice cream'
       );
