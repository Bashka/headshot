import * as PixiJS from "pixi.js";
import { Keyboard } from "@yandeu/keyboard";
import { PersonState } from "view/model";
import { signal } from "../../../../server/src/signal";
import { Hash } from "../../stage";

export namespace UI {
  export class VerticalGrid extends PixiJS.Container {
    constructor(public offset: number) {
      super();
    }

    protected sort() {
      this.children.forEach(({ position }, i) =>
        position.set(0, i * this.offset)
      );
    }

    addChild<T extends PixiJS.DisplayObject[]>(...children: T) {
      super.addChild(...children);
      this.sort();
      return this;
    }

    removeChild<T extends PixiJS.DisplayObject[]>(...children: T) {
      super.removeChild(...children);
      this.sort();
      return this;
    }
  }

  export class MenuItem extends PixiJS.Text {
    protected _selected = false;

    protected _enable = true;

    constructor(
      public readonly id: number,
      text: string = "",
      style?: Partial<PixiJS.ITextStyle> | PixiJS.ITextStyle
    ) {
      super(text, {
        ...style,
        fill: 0xffffff,
      });
    }

    get enable() {
      return this._enable;
    }

    set enable(enable) {
      this._enable = enable;
      this.style.fill = enable ? 0xffffff : 0xaaaaaa;
    }

    get selected() {
      return this._selected;
    }

    select() {
      this._selected = true;
      this.style.fill = 0xffff00;
    }

    blur() {
      this._selected = false;
      this.style.fill = 0xffffff;
    }

    toggle() {
      this._selected ? this.blur() : this.select();
    }
  }

  export class Menu extends VerticalGrid {
    protected _items = new Map<number, MenuItem>();

    constructor() {
      super(20);
      for (let i = 0; i < 10; i++) {
        const item = new MenuItem(i < 9 ? i + 1 : 0, "", {
          fontFamily: "Arial",
          fontSize: 14,
          align: "left",
        });
        this._items.set(item.id, item);
        this.addChild(item);
      }
    }

    addItem(text: string, enable = true) {
      const candidate = Array.from(this._items.values()).find(
        ({ text }) => text === ""
      );
      if (!candidate) throw new Error("Empty menu item not found");
      candidate.text = `${candidate.id}. ${text}`;
      candidate.enable = enable;
      return candidate;
    }

    removeItemById(id: number) {
      const item = this._items.get(id);
      item && (item.text = "");
    }

    removeItem({ id }: MenuItem) {
      this.removeItemById(id);
    }
  }
}

class AttackCommandMenu extends PixiJS.Container {
  protected readonly _menu = new UI.Menu();

  protected readonly _foot = new UI.VerticalGrid(20);

  protected _person: PersonState | null = null;

  public readonly onSelect = signal<{
    person: PersonState;
    command: "follow" | "move";
  } | null>();

  constructor() {
    super();
    this.addChild(this._menu);
    this._menu.addItem("Follow me");
    this._menu.addItem("Move");

    this.addChild(this._foot);
    this._foot.position.set(0, 220);
    this._foot.addChild(
      new PixiJS.Text("q - back", {
        fontFamily: "Arial",
        fontSize: 14,
        fill: 0xffffff,
        align: "right",
      })
    );
  }

  set person(person: PersonState | null) {
    this._person = person;
  }

  get person() {
    return this._person;
  }

  select(id: number) {
    if (id === -1) return this.onSelect(null);

    const { person } = this;
    if (!person) return;
    switch (id) {
      case 1:
        return this.onSelect({ person, command: "follow" });
      case 2:
        return this.onSelect({ person, command: "move" });
    }
  }
}

class AttackListMenu extends PixiJS.Container {
  protected readonly _menu = new UI.Menu();

  protected readonly _foot = new UI.VerticalGrid(20);

  protected readonly _items = new Map<
    number,
    { item: UI.MenuItem; person: PersonState }
  >();

  public readonly onChange = signal<number>();

  public readonly onSelect = signal<{ person: PersonState } | null>();

  constructor() {
    super();
    this.addChild(this._menu);
    this.addChild(this._foot);
    this._foot.position.set(0, 220);
    this._foot.addChild(
      new PixiJS.Text("q - back", {
        fontFamily: "Arial",
        fontSize: 14,
        fill: 0xffffff,
        align: "right",
      })
    );
  }

  addPerson(person: PersonState) {
    const item = this._menu.addItem(person.id);
    this._items.set(item.id, { item, person });
    this.onChange(this._items.size);
  }

  removePerson(person: PersonState) {
    const { item } = Array.from(this._items.values()).find(
      ({ person: { id } }) => id === person.id
    ) ?? { item: null };
    if (!item) return;
    this._menu.removeItem(item);
    this._items.delete(item.id);
    this.onChange(this._items.size);
  }

  select(id: number) {
    if (id === -1) return this.onSelect(null);

    const { person } = this._items.get(id) ?? { person: null };
    if (person) return this.onSelect({ person });
  }
}

class MainMenu extends PixiJS.Container {
  protected readonly _menu = new UI.Menu();

  protected readonly _items = {
    attack: this._menu.addItem("attack", false),
    defend: this._menu.addItem("defend", false),
    utils: this._menu.addItem("utils", false),
    builds: this._menu.addItem("builds", false),
  };

  public readonly onSelect = signal<keyof MainMenu["_items"]>();

  constructor() {
    super();
    this.addChild(this._menu);
  }

  enable(item: keyof MainMenu["_items"], state: boolean) {
    this._items[item].enable = state;
  }

  select(id: number) {
    switch (id) {
      case 1:
        return this._items.attack.enable && this.onSelect("attack");
      case 2:
        return this._items.defend.enable && this.onSelect("defend");
      case 3:
        return this._items.utils.enable && this.onSelect("utils");
      case 4:
        return this._items.builds.enable && this.onSelect("builds");
    }
  }
}

class Menu extends PixiJS.Container {
  public readonly states = {
    main: new MainMenu(),
    attackList: new AttackListMenu(),
    attackCommand: new AttackCommandMenu(),
  };

  protected _state: keyof Menu["states"] = "main";

  public readonly onPersonFocus = signal<PersonState>();
  public readonly onPersonBlur = signal<PersonState>();

  constructor() {
    super();
    this.addChild(this.state);

    this.states.main.onSelect((item) => {
      switch (item) {
        case "attack":
          return this.change("attackList");
      }
    });
    this.states.attackList.onSelect((item) => {
      if (item === null) return this.change("main");
      this.states.attackCommand.person = item.person;
      this.onPersonFocus(item.person);
      this.change("attackCommand");
    });
    this.states.attackList.onChange((count) => {
      return this.states.main.enable("attack", count > 0);
    });
    this.states.attackCommand.onSelect((item) => {
      const { person } = this.states.attackCommand;
      person && this.onPersonBlur(person);
      this.states.attackCommand.person = null;
      this.change("attackList");
      if (item) console.info(item);
    });
  }

  get state() {
    return this.states[this._state];
  }

  change(state: keyof Menu["states"]) {
    this._state = state;
    this.removeChildren();
    this.addChild(this.state);
  }

  select(id: number) {
    this.state.select(id);
  }
}

export interface Params {
  persons: Hash<PersonState>;
  me: string;
  keyboard: Keyboard;
}

export default function ({ persons, me, keyboard }: Params) {
  const menu = new Menu();

  persons.onAdd((person) => {
    if (person.id === me || person.owner !== me) return;
    menu.states.attackList.addPerson(person);
  });
  persons.onDelete((person) => {
    if (person.id === me || person.owner !== me) return;
    menu.states.attackList.removePerson(person);
  });

  const controls: Record<string, number | undefined> = {
    Digit1: 1,
    Digit2: 2,
    Digit3: 3,
    Digit4: 4,
    Digit5: 5,
    Digit6: 6,
    Digit7: 7,
    Digit8: 8,
    Digit9: 9,
    Digit0: 0,
    KeyQ: -1,
  };
  keyboard.on.down(Object.keys(controls).join(" "), (code) => {
    const id = controls[code];
    id !== undefined && menu.select(id);
  });

  return menu;
}
