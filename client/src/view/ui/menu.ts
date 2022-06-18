import * as PixiJS from "pixi.js";
import { Keyboard } from "@yandeu/keyboard";
import { signal } from "../../../../server/src/signal";
import { PersonState } from "../model";
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

interface SubMenu {
  select(id: number): any;
}

class AttackingCommandMenu extends PixiJS.Container {
  public readonly menu = new UI.Menu();

  public readonly foot = new UI.VerticalGrid(20);

  constructor() {
    super();
    this.addChild(this.menu);
    this.addChild(this.foot);
    this.foot.position.set(0, 220);
    this.foot.addChild(
      new PixiJS.Text("q - back", {
        fontFamily: "Arial",
        fontSize: 14,
        fill: 0xffffff,
        align: "right",
      })
    );
  }
}

class AttackingMenu extends PixiJS.Container implements SubMenu {
  public readonly menu = new UI.Menu();

  public readonly foot = new UI.VerticalGrid(20);

  constructor(protected _state: Menu) {
    super();
    this.addChild(this.menu);
    this.addChild(this.foot);
    this.foot.position.set(0, 220);
    this.foot.addChild(
      //new PixiJS.Text("shift - multiselect", {
      //  fontFamily: "Arial",
      //  fontSize: 14,
      //  fill: 0xffffff,
      //  align: "right",
      //}),
      new PixiJS.Text("q - back", {
        fontFamily: "Arial",
        fontSize: 14,
        fill: 0xffffff,
        align: "right",
      })
    );
  }

  select(id: number) {
    if (id === -1) return (this._state.state = "main");
  }
}

class DefendingMenu extends PixiJS.Container implements SubMenu {
  public readonly menu = new UI.Menu();

  public readonly foot = new UI.VerticalGrid(20);

  constructor(protected _state: Menu) {
    super();
    this.addChild(this.menu);
    this.addChild(this.foot);
    this.foot.position.set(0, 220);
    this.foot.addChild(
      new PixiJS.Text("shift - multiselect", {
        fontFamily: "Arial",
        fontSize: 14,
        fill: 0xffffff,
        align: "right",
      }),
      new PixiJS.Text("q - back", {
        fontFamily: "Arial",
        fontSize: 14,
        fill: 0xffffff,
        align: "right",
      })
    );
  }

  get active() {
    return false;
  }

  select(id: number) {
    if (id === -1) return (this._state.state = "main");
  }
}

class UtilitiesMenu extends PixiJS.Container implements SubMenu {
  public readonly menu = new UI.Menu();

  public readonly foot = new UI.VerticalGrid(20);

  constructor(protected _state: Menu) {
    super();
    this.addChild(this.menu);
    this.addChild(this.foot);
    this.foot.position.set(0, 220);
    this.foot.addChild(
      new PixiJS.Text("shift - multiselect", {
        fontFamily: "Arial",
        fontSize: 14,
        fill: 0xffffff,
        align: "right",
      }),
      new PixiJS.Text("q - back", {
        fontFamily: "Arial",
        fontSize: 14,
        fill: 0xffffff,
        align: "right",
      })
    );
  }

  get active() {
    return false;
  }

  select(id: number) {
    if (id === -1) return (this._state.state = "main");
  }
}

class BuildingMenu extends PixiJS.Container implements SubMenu {
  public readonly menu = new UI.Menu();

  public readonly foot = new UI.VerticalGrid(20);

  constructor(protected _state: Menu) {
    super();
    this.addChild(this.menu);
    this.addChild(this.foot);
    this.foot.position.set(0, 220);
    this.foot.addChild(
      new PixiJS.Text("q - back", {
        fontFamily: "Arial",
        fontSize: 14,
        fill: 0xffffff,
        align: "right",
      })
    );
  }

  get active() {
    return false;
  }

  select(id: number) {
    if (id === -1) return (this._state.state = "main");
  }
}

class MainMenu extends UI.Menu implements SubMenu {
  protected __items = {
    attaking: this.addItem("attaking", false),
    defending: this.addItem("defending", false),
    utilities: this.addItem("utilities", false),
    building: this.addItem("building", false),
  };

  constructor(protected _menu: Menu) {
    super();
    _menu.onChange(
      ({ menu, size }) =>
        menu === "main" || (this.__items[menu].enable = size > 0)
    );
  }

  select(id: number) {
    const element = Object.entries(this.__items)[id - 1];
    if (!element) return;
    const [name, item] = element;
    item.enable && (this._menu.state = name as keyof MainMenu["__items"]);
  }
}

class Menu extends PixiJS.Container {
  public readonly onChange = signal<{
    menu: keyof Menu["states"];
    size: number;
  }>();

  public readonly states = {
    attaking: new AttackingMenu(this),
    defending: new DefendingMenu(this),
    utilities: new UtilitiesMenu(this),
    building: new BuildingMenu(this),
    main: new MainMenu(this),
  };

  protected _state!: keyof Menu["states"];

  protected _attakingItems = new Map<string, UI.MenuItem>();

  protected _defendingItems = new Map<string, UI.MenuItem>();

  protected _utilitiesItems = new Map<string, UI.MenuItem>();

  protected _buildingItems = new Map<string, UI.MenuItem>();

  constructor(keyboard: Keyboard) {
    super();
    this.state = "main";
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
      id !== undefined && this.menu.select(id);
    });
  }

  get menu() {
    return this.states[this._state];
  }

  set state(state: keyof Menu["states"]) {
    this._state = state;
    this.removeChildren();
    this.addChild(this.menu);
  }

  addAttaking({ id }: PersonState) {
    this._attakingItems.set(id, this.states.attaking.menu.addItem(id));
    this.onChange({ menu: "attaking", size: this._attakingItems.size });
  }

  removeAttaking({ id }: PersonState) {
    const item = this._attakingItems.get(id);
    item && this.states.attaking.menu.removeItem(item);
    this.onChange({ menu: "attaking", size: this._attakingItems.size });
  }

  addDefending({ id }: PersonState) {
    this._defendingItems.set(id, this.states.defending.menu.addItem(id));
    this.onChange({ menu: "defending", size: this._defendingItems.size });
  }

  removeDefending({ id }: PersonState) {
    const item = this._defendingItems.get(id);
    item && this.states.defending.menu.removeItem(item);
    this.onChange({ menu: "defending", size: this._defendingItems.size });
  }

  addUtility({ id }: PersonState) {
    this._utilitiesItems.set(id, this.states.utilities.menu.addItem(id));
    this.onChange({ menu: "utilities", size: this._utilitiesItems.size });
  }

  removeUtility({ id }: PersonState) {
    const item = this._utilitiesItems.get(id);
    item && this.states.utilities.menu.removeItem(item);
    this.onChange({ menu: "utilities", size: this._utilitiesItems.size });
  }

  addBuilding({ id }: PersonState) {
    this._buildingItems.set(id, this.states.building.menu.addItem(id));
    this.onChange({ menu: "building", size: this._buildingItems.size });
  }

  removeBuilding({ id }: PersonState) {
    const item = this._buildingItems.get(id);
    item && this.states.building.menu.removeItem(item);
    this.onChange({ menu: "building", size: this._buildingItems.size });
  }
}

export interface Params {
  persons: Hash<PersonState>;
  me: string;
  keyboard: Keyboard;
}

export default function ({ persons, me, keyboard }: Params) {
  const container = new PixiJS.Container();

  const menu = new Menu(keyboard);
  container.addChild(menu);

  /*
  const foot = new UI.VerticalGrid(20);
  foot.position.set(0, 220);
  const tab = new PixiJS.Text("q - back", {
    fontFamily: "Arial",
    fontSize: 14,
    fill: 0xffffff,
    align: "right",
  });
  const ctrl = new PixiJS.Text("shift - add", {
    fontFamily: "Arial",
    fontSize: 14,
    fill: 0xffffff,
    align: "right",
  });
  foot.addChild(tab, ctrl);
  */

  persons.onAdd((person) => {
    if (person.id === me || person.owner !== me) return;
    menu.addAttaking(person);
  });
  persons.onDelete((person) => {
    if (person.id === me || person.owner !== me) return;
    menu.removeAttaking(person);
  });

  /*
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
  let selected: number[] = [];
  const onSelect = signal<number[]>();
  keyboard.on.down(Object.keys(controls).join(" "), (code) => {
    const i = controls[code];
    if (i === undefined) return;

    if (i >= 0) {
      if (keyboard.key("ShiftLeft").isDown) {
        selected = selected.includes(i)
          ? selected.filter((n) => i !== n)
          : [...selected, i];
      } else {
        selected = selected.includes(i) ? [] : [i];
      }
    } else {
      selected = [];
    }
    onSelect(selected);
  });

  onSelect((selected) => {
    Array.from(attacking.values()).forEach(({ view }) => {
      selected.includes(view.id) ? view.select() : view.blur();
    });
  });
  */

  return container;
}
