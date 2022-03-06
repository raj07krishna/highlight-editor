import { IfStmt } from '@angular/compiler';
import { Pipe, PipeTransform } from '@angular/core';

export interface IHighlightObj {
  highlightedValue: string;
  totalErrorCount: string;
}

@Pipe({
  name: 'highlightHtml',
})
export class HighlightHtmlPipe implements PipeTransform {
  highlightedObject: Map<string, string> = new Map();
  val: string = '';
  transform(value: string, args: string): Map<string, string> {
    const space = '&nbsp;';
    const emtyString = ''
    let regex: any;
    const invalidvalues = new Set<string>();
    if (args === 'X') {
      regex = new RegExp("[^0-9a-zA-Z:,/'?.+\\-()\\r\\n *]", 'gm');
    } else if (args === 'Z') {
      regex = new RegExp(
        '[^0-9a-zA-Z:,/\'?.+\\-()=@#&{};<>_!"%\\r\\n *]',
        'gm'
      );
    }
    let totalErrorCount = 0;
    const match = value.match(regex);
    if (!match) {
      if (value && value.length) {
        this.highlightedObject.set('highlightedValue', value);
        this.highlightedObject.set(
          'totalErrorCount',
          totalErrorCount.toString()
        );
        return this.highlightedObject;
      } else {
        return new Map();
      }
    }
    let valueArray: RegExpMatchArray | null = [];
    // if (value.length === 1 && value.trim().length === 0) {
    //   value = value.trim();
    // } else {
    // valueArray = value.match(/\w+|\s+|[^\s\w]+/g);
    // if (valueArray[valueArray.length - 1] === '') {
    //   valueArray.pop();
    // if (value.trim().length === 0) {
    //   valueArray.pop();
    // }
    // }
    // }
    valueArray=this.splitText(value);
    value = '';
    this.highlightedObject = new Map();
    if (valueArray !== null) {
      for (let i = 0; i < valueArray.length; i++) {
        let element = valueArray[i];
        let nextElement = null;
        if (i + 1 < valueArray.length) {
          nextElement = valueArray[i + 1];
        }
        let val = '';
        if (element.match(regex) && element.match(regex)?.length !== 0) {
          val = `<span class='highlight'>${element}</span>`;
        } else {
          val = element;
        }

        value += val;
      }
    }
    // value.trim();
    match.forEach((element) => {
      if (!invalidvalues.has(element)) {
        value = value
          .split(element)
          .join(`<font class='color-highlight'>${element}</font>`);
        invalidvalues.add(element);
      }
    });
    value = `${value}<span>${emtyString}</span>`;
    this.val = value;
    totalErrorCount = this.val.split('</font>').length - 1;
    this.highlightedObject.set('highlightedValue', value);
    this.highlightedObject.set('totalErrorCount', totalErrorCount.toString());
    return this.highlightedObject;
  }

  splitText(text:string){
    let words = [];
    let newWord = '';
    for (let i=0; i<text.length; i++) {
        let char = text[i]
        if(char.trim().length === 0 && newWord.trim().length === 0){
            newWord += char;
        } else if(char.trim().length === 0 && newWord.length>0 && newWord.trim().length >0) {
            i--;
            words.push(newWord);
            newWord = '';
            continue;
        } else if (char.trim().length !== 0 && newWord.length>0 && newWord.trim().length === 0){
            i--;
            words.push(newWord);
            newWord = '';
            continue;
            
        } else {
            newWord += char;
        }
    }
    words.push(newWord)
    return words
}
}
