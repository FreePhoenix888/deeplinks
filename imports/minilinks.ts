export interface LinkPlain<Ref extends number> {
  id: Ref;
  type_id: Ref;
  from_id: Ref;
  to_id: Ref;
}

export interface LinkRelations<L> {
  typed: L[];
  type: L;
  in: L[];
  inByType: { [id: number]: L[] };
  out: L[];
  outByType: { [id: number]: L[] };
  from: L;
  to: L;
}

export interface Link<Ref extends number> extends LinkPlain<Ref>, LinkRelations<Link<Ref>> {
  [key: string]: any;
}

export interface LinksResult<Link> {
  links: Link[];
  types: { [id: number]: Link[] };
  byId: { [id: number]: Link };
}

export interface MinilinksGeneratorOptions {
  id: 'id',
  type_id: 'type_id',
  type: 'type',
  typed: 'typed',
  from_id: 'from_id',
  from: 'from',
  out: 'out',
  to_id: 'to_id',
  to: 'to',
  in: 'in',
  inByType: 'inByType',
  outByType: 'outByType',
}

export const MinilinksGeneratorOptionsDefault: MinilinksGeneratorOptions = {
  id: 'id',
  type_id: 'type_id',
  type: 'type',
  typed: 'typed',
  from_id: 'from_id',
  from: 'from',
  out: 'out',
  to_id: 'to_id',
  to: 'to',
  in: 'in',
  inByType: 'inByType',
  outByType: 'outByType',
};

export function Minilinks<MGO extends MinilinksGeneratorOptions>(options: MGO) {
  return function minilinks<L extends Link<number>>(linksArray = []): LinksResult<L> {
    const types: { [id: number]: L[] } = {};
    const byId: { [id: number]: L } = {};
    const links: L[] = [];
    for (let l = 0; l < linksArray.length; l++) {
      const link = { ...linksArray[l], [options.typed]: [], [options.in]: [], [options.out]: [], [options.inByType]: {}, [options.outByType]: {} };
      byId[link[options.id]] = link;
      types[link[options.type_id]] = types[link[options.type_id]] || [];
      types[link[options.type_id]].push(link);
      links.push(link);
    }
    for (let l = 0; l < links.length; l++) {
      const link = links[l];
      if (byId[link[options.type_id]]) {
        link[options.type] = byId[link[options.type_id]];
        byId[link[options.type_id]][options.typed].push(link);
      }
      if (byId[link[options.from_id]]) {
        link[options.from] = byId[link[options.from_id]];
        byId[link[options.from_id]][options.out].push(link);
        byId[link[options.from_id]][options.outByType][link[options.type_id]] = byId[link[options.from_id]][options.outByType][link[options.type_id]] || [];
        byId[link[options.from_id]][options.outByType][link[options.type_id]].push(link);
      }
      if (byId[link[options.to_id]]) {
        link[options.to] = byId[link[options.to_id]];
        byId[link[options.to_id]][options.in].push(link);
        byId[link[options.to_id]][options.inByType][link[options.type_id]] = byId[link[options.to_id]][options.inByType][link[options.type_id]] || [];
        byId[link[options.to_id]][options.inByType][link[options.type_id]].push(link);
      }
    }
    return {
      links, types, byId,
    };
  }
}

export const minilinks = Minilinks(MinilinksGeneratorOptionsDefault);
