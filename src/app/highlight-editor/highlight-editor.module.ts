import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HighlightEditorComponent } from './highlight-editor.component';



@NgModule({
  declarations: [
    HighlightEditorComponent
  ],
  imports: [
    CommonModule
  ],
  exports:[HighlightEditorComponent]
})
export class HighlightEditorModule { }
