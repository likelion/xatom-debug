'use babel';
/*!
 * XAtom Debug
 * Copyright(c) 2017 Williams Medina <williams.medinaa@gmail.com>
 * MIT Licensed
 */

import { Storage, Collection } from './Storage';

const {
  CompositeDisposable,
  Emitter,
  Range,
  Disposable
} = require('atom');

export interface Breakpoint {
  lineNumber: number,
  columnNumber: number,
  filePath: string,
  condition: string,
  marker?: any
}

export type Breakpoints = Array<Breakpoint>;

export class BreakpointManager {
  private emitter = new Emitter();
  private lineNumbers: HTMLElement;
  private breakpoints: Breakpoints = [];
  private currentEditor: any;
  private lineEventListener: EventListenerOrEventListenerObject;
  public storage: Collection;
  constructor () {
    this.lineEventListener = (e) => {
      const element = (<HTMLElement> e.target);
      if (element.classList.contains('line-number')) {
        const filePath = this.currentEditor.getPath();
        const lineNumber = parseInt(element.textContent, 0);
        const breakpoint = this.getBreakpoint(filePath, lineNumber);
        if (breakpoint) {
          this.removeBreakpoint(filePath, lineNumber);
        } else {
          this.addBreakpoint(filePath, lineNumber)
        }
      }
    };
  }
  setBreakpoints (breakpoints: Breakpoints) {
    this.breakpoints = breakpoints;
    this.restoreMarkers();
  }
  getBreakpoints (): Breakpoints {
    return this.breakpoints;
  }
  restoreMarkers () {
    if (this.currentEditor) {
      this
        .breakpoints
        .filter((b) => b.filePath === this.currentEditor.getPath())
        .forEach((b) => {
          if (b.marker) b.marker.destroy();
          b.marker = this.createMarker(this.currentEditor, b.lineNumber - 1);
        });
    }
  }
  getEditorLineNumbers (editor): Promise<HTMLElement> {
    return new Promise((resolve, reject) => {
      const gutters = editor.getGutters();
      const lineGutter = gutters.find((g) => g.name === 'line-number');
      if (lineGutter) {
        resolve(lineGutter.element);
      } else {
        reject('Unable to find line numbers');
      }
    });
  }
  async attachBreakpoints (editor: any) {
    this.dettachBreakpoints();
    this.lineNumbers = await this.getEditorLineNumbers(editor);
    this.currentEditor = editor;
    // Listen gutter line number
    this.lineNumbers.addEventListener('click', this.lineEventListener);
    // Restore breakpoint markers
    this.restoreMarkers();
  }
  dettachBreakpoints () {
    if (this.currentEditor && this.lineNumbers) {
      this.lineNumbers.removeEventListener('click', this.lineEventListener);
    }
  }
  addBreakpoint (filePath: string, lineNumber: number) {
    const breakpoint = <Breakpoint> {
      filePath,
      lineNumber,
      columnNumber: 0
    };
    this.breakpoints.push(breakpoint);
    if (this.currentEditor && this.currentEditor.getPath() === filePath) {
      breakpoint.marker = this.createMarker(this.currentEditor, lineNumber - 1);
    }
    this.emitter.emit('didAddBreakpoint', breakpoint);
    this.storage.put({
      filePath,
      lineNumber
    });
  }
  removeBreakpoint (filePath: string, lineNumber: number) {
    const breakpoint = this.getBreakpoint(filePath, lineNumber);
    const index = this.breakpoints.indexOf(breakpoint);
    if (breakpoint.marker) {
      breakpoint.marker.destroy();
    }
    if (index > -1) {
      this.emitter.emit('didRemoveBreakpoint', breakpoint);
      this.breakpoints.splice(index, 1);
      this.storage.delete({
        filePath,
        lineNumber
      });
    }
  }
  getBreakpoint (filePath: string, lineNumber: number) {
    return this.breakpoints.find((b) => {
      return b.filePath === filePath && b.lineNumber === lineNumber;
    });
  }
  createMarker (editor: any, lineNumber: number) {
    let range = new Range([lineNumber, 0], [lineNumber, 0]);
    let marker = editor.markBufferRange(range);
    let decorator = editor.decorateMarker(marker, {
      type: 'line-number',
      class: 'xatom-breakpoint'
    });
    return marker;
  }
  onDidAddBreakpoint (cb) {
    return this.emitter.on('didAddBreakpoint', cb);
  }
  onDidRemoveBreakpoint (cb) {
    return this.emitter.on('didRemoveBreakpoint', cb);
  }
  destroy () {

  }
}