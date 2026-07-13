export function paginate(items, page, pageSize = 6) {
  const list = Array.isArray(items) ? items : [];
  const pages = Math.max(1, Math.ceil(list.length / pageSize));
  const safePage = Math.min(Math.max(1, page), pages);
  return { items: list.slice((safePage - 1) * pageSize, safePage * pageSize), pages, page: safePage };
}
