import {
  Attribute,
  Component,
  ElementRef,
  EventEmitter,
  HostBinding,
  HostListener,
  Input,
  OnDestroy,
  OnInit,
  Optional,
  Output,
  Renderer2,
  SecurityContext,
  Self,
  ViewChild,
} from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { Observable, Subject } from 'rxjs';
import { HighlightHtmlPipe } from '../highlight-html.pipe';
import { IEditorData, IEditorProperties } from './highlight-editor.model';
import { debounceTime, take } from 'rxjs/operators';
import {
  MAT_FORM_FIELD,
  MatFormField,
  MatFormFieldControl,
} from '@angular/material/form-field';
import {
  AbstractControl,
  ControlValueAccessor,
  FormControl,
  NgControl,
} from '@angular/forms';
import { FocusMonitor } from '@angular/cdk/a11y';
import { ErrorStateMatcher } from '@angular/material/core';
import { coerceBooleanProperty } from '@angular/cdk/coercion';

@Component({
  selector: 'app-highlight-editor',
  templateUrl: './highlight-editor.component.html',
  styleUrls: ['./highlight-editor.component.scss'],
  providers: [
    {
      provide: MatFormFieldControl,
      useExisting: HighlightEditorComponent,
    },
  ],
})
export class HighlightEditorComponent
  implements OnInit, OnDestroy, MatFormFieldControl<any>, ControlValueAccessor
{
  @Input() properties: IEditorProperties = {
    editable: true,
    spellcheck: true,
    height: 'auto',
    minHeight: '1.5rem',
    maxHeight: 'auto',
    width: 'auto',
    minWidth: '0',
    placeholder: 'Enter text here...',
    defaultParagraphSeparator: '',
    sanitize: true,
    outline: true,
  };
  // @Input() id = '';
  @Input() id!: string;
  @Input()
  get placeholder(): string {
    return this.properties.placeholder ? this.properties.placeholder : '';
  }
  set placeholder(value: string) {
    this.properties.placeholder = value;
    this.stateChanges.next();
  }
  @Input() tabIndex: number | null = null;
  @ViewChild('editor', { static: true }) textArea!: ElementRef;
  @ViewChild('placeholder', { static: true }) placeholderRef!: ElementRef;
  @Input() set value(value: string) {
    this.htmlAsString = value;
    this.stateChanges.next();
  }
  get value() {
    return this.htmlAsString;
  }
  private htmlAsString = '';

  /** emits `blur` event when focused out from the textarea */
  // eslint-disable-next-line @angular-eslint/no-output-native, @angular-eslint/no-output-rename
  @Output('blur') blurEvent: EventEmitter<FocusEvent> =
    new EventEmitter<FocusEvent>();

  /** emits `focus` event when focused in to the textarea */
  // eslint-disable-next-line @angular-eslint/no-output-rename, @angular-eslint/no-output-native
  @Output('focus') focusEvent: EventEmitter<FocusEvent> =
    new EventEmitter<FocusEvent>();
  // eslint-disable-next-line @angular-eslint/no-output-rename, @angular-eslint/no-output-native
  @Output('click') clickEvent: EventEmitter<any> = new EventEmitter<any>();
  @Output() data: EventEmitter<IEditorData> = new EventEmitter<IEditorData>();

  @HostBinding('attr.tabindex') tabindex = -1;

  // @HostListener('focus')
  // onFocus() {
  //   this.focus();
  // }

  editorValueMap: Map<string, string> = new Map();
  htmlContent: string = '';
  private subject: Subject<string | undefined> = new Subject();

  constructor(
    @Attribute('tabindex') defaultTabIndex: string,
    private sanitizer: DomSanitizer,
    private highLightHtmlPipe: HighlightHtmlPipe,
    private renderer: Renderer2,
    private focusMonitor: FocusMonitor,
    private errorStateMatcher: ErrorStateMatcher,
    @Optional() @Self() public ngControl: NgControl
  ) {
    if (this.ngControl != null) {
      this.ngControl.valueAccessor = this;
    }
    const parsedTabIndex = Number(defaultTabIndex);
    this.tabIndex =
      parsedTabIndex || parsedTabIndex === 0 ? parsedTabIndex : null;
  }
  writeValue(value: string): void {
    this.htmlAsString = value;
  }

  onChange = (value: string) => {};
  onToutch = () => {};

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: any): void {
    this.onToutch = fn;
  }
  setDisabledState(isDisabled: boolean): void {
    const div = this.textArea.nativeElement;
    const action = isDisabled ? 'addClass' : 'removeClass';
    this.renderer[action](div, 'disabled');
    this.disabled = isDisabled;
    // this.renderer.setAttribute(
    //   this.textArea.nativeElement,
    //   'contenteditable',
    //   String(!isDisabled),
    // );
    this.properties.editable = !isDisabled;
    // this.stateChanges.next();
  }

  stateChanges = new Subject<void>();

  focused = false;
  touched = false;
  get empty(): boolean {
    return this.extractTextFromHTML(this.htmlAsString)?.trim().length
      ? false
      : true;
  }
  @HostBinding('class.floating')
  get shouldLabelFloat() {
    return (this.focused || !this.empty) && !this.disabled;
  }
  @Input()
  get required() {
    return this._required;
  }
  set required(req) {
    this._required = coerceBooleanProperty(req);
    this.stateChanges.next();
  }
  public _required = false;
  @Input() disabled = false;
  get errorState(): boolean {
    return this.extractTextFromHTML(this.htmlAsString)?.trim().length === 0 &&
      this.touched &&
      !this.disabled
      ? true
      : false;
  }

  @HostBinding('attr.aria-describedby') describedBy = '';
  setDescribedByIds(ids: string[]): void {
    this.describedBy = ids.join(' ');
  }
  onContainerClick(event: any): void {
    this.focusMonitor.focusVia(this.textArea, 'program');
    this.setFocus();
    event.stopPropagation();
  }

  ngOnInit() {
    this.subject.pipe(debounceTime(1000)).subscribe(() => {
      this.startProcessing();
    });
    this.focusMonitor.monitor(this.textArea).subscribe((focused) => {
      this.focused = !!focused;
      this.renderer.setStyle(
        this.placeholderRef.nativeElement,
        'display',
        this.empty && this.focused ? 'inline-block' : 'none'
      );
      this.stateChanges.next();
    });
    this.applyHighlight(this.extractTextFromHTML(this.htmlAsString));
  }

  onKeyUp(searchTextValue: any) {
    this.subject.next(searchTextValue);
  }

  onContentChange() {
    let innerText = this.textArea.nativeElement?.innerText;
    if (innerText.length > 0) {
      this.renderer.setStyle(
        this.placeholderRef.nativeElement,
        'display',
        'none'
      );
    } else{
      this.renderer.setStyle(
        this.placeholderRef.nativeElement,
        'display',
        'inline-block'
      );
    }
    this.data.emit({
      html: this.textArea.nativeElement?.innerHTML,
      text: innerText,
    });
  }

  startProcessing(): void {
    let html = '';
    html = this.textArea.nativeElement?.innerHTML;
    let innerText = this.textArea.nativeElement?.innerText;
    if (!html || innerText === '<br>') {
      html = '';
    }
    this.properties.sanitize || this.properties.sanitize === undefined
      ? this.sanitizer.sanitize(SecurityContext.HTML, html)
      : html;

    this.applyHighlight(innerText);
  }

  extractTextFromHTML(html: any) {
    return new DOMParser().parseFromString(html, 'text/html').documentElement
      .textContent;
  }

  applyHighlight(htmlValue: any) {
    const text = this.extractTextFromHTML(htmlValue);
    if (text) {
      this.editorValueMap = this.highLightHtmlPipe.transform(text, 'X');
    } else {
      this.editorValueMap.set('highlightedValue', '');
      this.editorValueMap.set('totalErrorCount', '0');
    }
    const htmlContent = `<p> ${this.editorValueMap.get(
      'highlightedValue'
    )} </p>`;
    const sanitisedHtml = this.sanitizer.sanitize(
      SecurityContext.HTML,
      htmlContent
    );
    const errorCount = this.editorValueMap.get('totalErrorCount');
    this.refreshView(sanitisedHtml as string);
    this.setFocus();
  }

  setFocus() {
    let range = document.createRange(); //Create a range (a range is a like the selection but invisible)
    range.selectNodeContents(this.textArea.nativeElement); //Select the entire contents of the element with the range
    range.collapse(false); //collapse the range to the end point. false means collapse to end rather than the start
    let selection = window.getSelection(); //get the selection object (allows you to change selection)
    selection?.removeAllRanges(); //remove any selections already made
    selection?.addRange(range);
    // this.textArea.nativeElement.focus();
  }

  onTextAreaBlur(event: FocusEvent) {
    this.startProcessing();
    this.blurEvent.emit(event);
    this.focused = false;
    window.getSelection()?.removeAllRanges();
  }

  onTextAreaFocus(event: FocusEvent): void {
    this.focused = true;
    this.focusEvent.emit(event);
    if (!this.touched) {
      this.touched = true;
    }
    event.stopPropagation();
  }

  onPaste(event: ClipboardEvent) {
    console.log('onPaste', event);
  }

  onClick(event: any) {
    this.clickEvent.emit(event);
  }

  refreshView(htmlValue: string): void {
    this.htmlAsString = htmlValue === null ? '' : htmlValue;
    this.renderer.setProperty(
      this.textArea.nativeElement,
      'innerHTML',
      this.htmlAsString
    );
  }
  ngOnDestroy(): void {
    this.focusMonitor.stopMonitoring(this.textArea);
    this.stateChanges.complete();
  }
}
