/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */


import {NgFor} from '@angular/common';
import {ChangeDetectorRef, Component, Directive, inject, OnInit, Pipe, PipeTransform, TemplateRef, ViewContainerRef} from '@angular/core';
import {TestBed} from '@angular/core/testing';

// Basic shared pipe used during testing.
@Pipe({name: 'multiply', pure: true, standalone: true})
class MultiplyPipe implements PipeTransform {
  transform(value: number, amount: number) {
    return value * amount;
  }
}

describe('control flow - if', () => {
  it('should add and remove views based on conditions change', () => {
    @Component({standalone: true, template: '@if (show) {Something} @else {Nothing}'})
    class TestComponent {
      show = true;
    }

    const fixture = TestBed.createComponent(TestComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toBe('Something');

    fixture.componentInstance.show = false;
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toBe('Nothing');
  });

  it('should expose expression value in context', () => {
    @Component({
      standalone: true,
      template: '@if (show; as alias) {{{show}} aliased to {{alias}}}',
    })
    class TestComponent {
      show: any = true;
    }

    const fixture = TestBed.createComponent(TestComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toBe('true aliased to true');

    fixture.componentInstance.show = 1;
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toBe('1 aliased to 1');
  });

  it('should not expose the aliased expression to `if` and `else if` blocks', () => {
    @Component({
      standalone: true,
      template: `
          @if (value === 1; as alias) {
            If: {{value}} as {{alias || 'unavailable'}}
          } @else if (value === 2) {
            ElseIf: {{value}} as {{alias || 'unavailable'}}
          } @else {
            Else: {{value}} as {{alias || 'unavailable'}}
          }
        `,
    })
    class TestComponent {
      value = 1;
    }

    const fixture = TestBed.createComponent(TestComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent.trim()).toBe('If: 1 as true');

    fixture.componentInstance.value = 2;
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent.trim()).toBe('ElseIf: 2 as unavailable');

    fixture.componentInstance.value = 3;
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent.trim()).toBe('Else: 3 as unavailable');
  });

  it('should expose the context to nested conditional blocks', () => {
    @Component({
      standalone: true,
      imports: [MultiplyPipe],
      template: `
          @if (value | multiply:2; as root) {
            Root: {{value}}/{{root}}

            @if (value | multiply:3; as inner) {
              Inner: {{value}}/{{root}}/{{inner}}

              @if (value | multiply:4; as innermost) {
                Innermost: {{value}}/{{root}}/{{inner}}/{{innermost}}
              }
            }
          }
        `,
    })
    class TestComponent {
      value = 1;
    }

    const fixture = TestBed.createComponent(TestComponent);
    fixture.detectChanges();
    let content = fixture.nativeElement.textContent;
    expect(content).toContain('Root: 1/2');
    expect(content).toContain('Inner: 1/2/3');
    expect(content).toContain('Innermost: 1/2/3/4');

    fixture.componentInstance.value = 2;
    fixture.detectChanges();
    content = fixture.nativeElement.textContent;
    expect(content).toContain('Root: 2/4');
    expect(content).toContain('Inner: 2/4/6');
    expect(content).toContain('Innermost: 2/4/6/8');
  });

  it('should expose the context to listeners inside nested conditional blocks', () => {
    let logs: any[] = [];

    @Component({
      standalone: true,
      imports: [MultiplyPipe],
      template: `
          @if (value | multiply:2; as root) {
            <button (click)="log(['Root', value, root])"></button>

            @if (value | multiply:3; as inner) {
              <button (click)="log(['Inner', value, root, inner])"></button>

              @if (value | multiply:4; as innermost) {
                <button (click)="log(['Innermost', value, root, inner, innermost])"></button>
              }
            }
          }
        `,
    })
    class TestComponent {
      value = 1;

      log(value: any) {
        logs.push(value);
      }
    }

    const fixture = TestBed.createComponent(TestComponent);
    fixture.detectChanges();
    const buttons = Array.from<HTMLButtonElement>(fixture.nativeElement.querySelectorAll('button'));
    buttons.forEach(button => button.click());
    fixture.detectChanges();

    expect(logs).toEqual([['Root', 1, 2], ['Inner', 1, 2, 3], ['Innermost', 1, 2, 3, 4]]);

    logs = [];
    fixture.componentInstance.value = 2;
    fixture.detectChanges();

    buttons.forEach(button => button.click());
    fixture.detectChanges();
    expect(logs).toEqual([['Root', 2, 4], ['Inner', 2, 4, 6], ['Innermost', 2, 4, 6, 8]]);
  });

  it('should expose expression value passed through a pipe in context', () => {
    @Component({
      standalone: true,
      template: '@if (value | multiply:2; as alias) {{{value}} aliased to {{alias}}}',
      imports: [MultiplyPipe],
    })
    class TestComponent {
      value = 1;
    }

    const fixture = TestBed.createComponent(TestComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toBe('1 aliased to 2');

    fixture.componentInstance.value = 4;
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toBe('4 aliased to 8');
  });

  // QUESTION: fundamental mismatch between the "template" and "container" concepts
  // those 2 calls to the ɵɵtemplate instruction will generate comment nodes and LContainer
  it('should destroy all views if there is nothing to display', () => {
    @Component({
      standalone: true,
      template: '@if (show) {Something}',
    })
    class TestComponent {
      show = true;
    }

    const fixture = TestBed.createComponent(TestComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toBe('Something');

    fixture.componentInstance.show = false;
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toBe('');
  });

  it('should be able to use pipes in conditional expressions', () => {
    @Component({
      standalone: true,
      imports: [MultiplyPipe],
      template: `
          @if ((value | multiply:2) === 2) {
            one
          } @else if ((value | multiply:2) === 4) {
            two
          } @else {
            nothing
          }
        `,
    })
    class TestComponent {
      value = 0;
    }

    const fixture = TestBed.createComponent(TestComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent.trim()).toBe('nothing');

    fixture.componentInstance.value = 2;
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent.trim()).toBe('two');

    fixture.componentInstance.value = 1;
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent.trim()).toBe('one');
  });

  it('should be able to use pipes injecting ChangeDetectorRef in if blocks', () => {
    @Pipe({name: 'test', standalone: true})
    class TestPipe implements PipeTransform {
      changeDetectorRef = inject(ChangeDetectorRef);

      transform(value: any) {
        return value;
      }
    }

    @Component({
      standalone: true,
      template: '@if (show | test) {Something}',
      imports: [TestPipe],
    })
    class TestComponent {
      show = true;
    }

    const fixture = TestBed.createComponent(TestComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toBe('Something');
  });

  describe('content projection', () => {
    it('should project an @if with a single root node into the root node slot', () => {
      @Component({
        standalone: true,
        selector: 'test',
        template: 'Main: <ng-content/> Slot: <ng-content select="[foo]"/>',
      })
      class TestComponent {
      }

      @Component({
        standalone: true,
        imports: [TestComponent],
        template: `
        <test>Before @if (true) {
          <span foo>foo</span>
        } After</test>
      `
      })
      class App {
      }

      const fixture = TestBed.createComponent(App);
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toBe('Main: Before  After Slot: foo');
    });

    it('should project an @if with multiple root nodes into the catch-all slot', () => {
      @Component({
        standalone: true,
        selector: 'test',
        template: 'Main: <ng-content/> Slot: <ng-content select="[foo]"/>',
      })
      class TestComponent {
      }

      @Component({
        standalone: true,
        imports: [TestComponent],
        template: `
        <test>Before @if (true) {
          <span foo>one</span>
          <div foo>two</div>
        } After</test>
      `
      })
      class App {
      }

      const fixture = TestBed.createComponent(App);
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toBe('Main: Before onetwo After Slot: ');
    });

    // Right now the template compiler doesn't collect comment nodes.
    // This test is to ensure that we don't regress if it happens in the future.
    it('should project an @if with a single root node and comments into the root node slot', () => {
      @Component({
        standalone: true,
        selector: 'test',
        template: 'Main: <ng-content/> Slot: <ng-content select="[foo]"/>',
      })
      class TestComponent {
      }

      @Component({
        standalone: true,
        imports: [TestComponent],
        template: `
        <test>Before @if (true) {
          <!-- before -->
          <span foo>foo</span>
          <!-- after -->
        } After</test>
      `
      })
      class App {
      }

      const fixture = TestBed.createComponent(App);
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toBe('Main: Before  After Slot: foo');
    });

    // Note: the behavior in this test is *not* intuitive, but it's meant to capture
    // the projection behavior from `*ngIf` with `@if`. The test can be updated if we
    // change how content projection works in the future.
    it('should project an @else content into the slot of @if', () => {
      @Component({
        standalone: true,
        selector: 'test',
        template:
            'Main: <ng-content/> One: <ng-content select="[one]"/> Two: <ng-content select="[two]"/>',
      })
      class TestComponent {
      }

      @Component({
        standalone: true,
        imports: [TestComponent],
        template: `
        <test>Before @if (value) {
          <span one>one</span>
        } @else {
          <span two>two</span>
        } After</test>
      `
      })
      class App {
        value = true;
      }

      const fixture = TestBed.createComponent(App);
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toBe('Main: Before  After One: one Two: ');

      fixture.componentInstance.value = false;
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toBe('Main: Before  After One: two Two: ');
    });

    it('should project the root node when preserveWhitespaces is enabled and there are no whitespace nodes',
       () => {
         @Component({
           standalone: true,
           selector: 'test',
           template: 'Main: <ng-content/> Slot: <ng-content select="[foo]"/>',
         })
         class TestComponent {
         }

         @Component({
           standalone: true,
           imports: [TestComponent],
           preserveWhitespaces: true,
           template: '<test>Before @if (true) {<span foo>one</span>} After</test>'
         })
         class App {
         }

         const fixture = TestBed.createComponent(App);
         fixture.detectChanges();
         expect(fixture.nativeElement.textContent).toBe('Main: Before  After Slot: one');
       });

    it('should not project the root node when preserveWhitespaces is enabled and there are whitespace nodes',
       () => {
         @Component({
           standalone: true,
           selector: 'test',
           template: 'Main: <ng-content/> Slot: <ng-content select="[foo]"/>',
         })
         class TestComponent {
         }

         @Component({
           standalone: true,
           imports: [TestComponent],
           preserveWhitespaces: true,
           // Note the whitespace due to the indentation inside @if.
           template: `
            <test>Before @if (true) {
              <span foo>one</span>
            } After</test>
          `
         })
         class App {
         }

         const fixture = TestBed.createComponent(App);
         fixture.detectChanges();
         expect(fixture.nativeElement.textContent).toMatch(/Main: Before\s+one\s+After Slot:/);
       });

    it('should not project the root node across multiple layers of @if', () => {
      @Component({
        standalone: true,
        selector: 'test',
        template: 'Main: <ng-content/> Slot: <ng-content select="[foo]"/>',
      })
      class TestComponent {
      }

      @Component({
        standalone: true,
        imports: [TestComponent],
        template: `
        <test>Before @if (true) {
          @if (true) {
            <span foo>one</span>
          }
        } After</test>
      `
      })
      class App {
      }

      const fixture = TestBed.createComponent(App);
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toMatch(/Main: Before\s+one\s+After Slot:/);
    });

    it('should project an @if with a single root template node into the root node slot', () => {
      @Component({
        standalone: true,
        selector: 'test',
        template: 'Main: <ng-content/> Slot: <ng-content select="[foo]"/>',
      })
      class TestComponent {
      }

      @Component({
        standalone: true,
        imports: [TestComponent, NgFor],
        template: `<test>Before @if (true) {
        <span *ngFor="let item of items" foo>{{item}}</span>
      } After</test>`
      })
      class App {
        items = [1, 2];
      }

      const fixture = TestBed.createComponent(App);
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toBe('Main: Before  After Slot: 12');

      fixture.componentInstance.items.push(3);
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toBe('Main: Before  After Slot: 123');
    });

    it('should invoke a projected attribute directive at the root of an @if once', () => {
      let directiveCount = 0;

      @Component({
        standalone: true,
        selector: 'test',
        template: 'Main: <ng-content/> Slot: <ng-content select="[foo]"/>',
      })
      class TestComponent {
      }

      @Directive({
        selector: '[foo]',
        standalone: true,
      })
      class FooDirective {
        constructor() {
          directiveCount++;
        }
      }

      @Component({
        standalone: true,
        imports: [TestComponent, FooDirective],
        template: `<test>Before @if (true) {
        <span foo>foo</span>
      } After</test>
      `
      })
      class App {
      }

      const fixture = TestBed.createComponent(App);
      fixture.detectChanges();

      expect(directiveCount).toBe(1);
      expect(fixture.nativeElement.textContent).toBe('Main: Before  After Slot: foo');
    });

    it('should invoke a projected template directive at the root of an @if once', () => {
      let directiveCount = 0;

      @Component({
        standalone: true,
        selector: 'test',
        template: 'Main: <ng-content/> Slot: <ng-content select="[foo]"/>',
      })
      class TestComponent {
      }

      @Directive({
        selector: '[templateDir]',
        standalone: true,
      })
      class TemplateDirective implements OnInit {
        constructor(
            private viewContainerRef: ViewContainerRef,
            private templateRef: TemplateRef<any>,
        ) {
          directiveCount++;
        }

        ngOnInit(): void {
          const view = this.viewContainerRef.createEmbeddedView(this.templateRef);
          this.viewContainerRef.insert(view);
        }
      }

      @Component({
        standalone: true,
        imports: [TestComponent, TemplateDirective],
        template: `<test>Before @if (true) {
        <span *templateDir foo>foo</span>
      } After</test>
      `
      })
      class App {
      }

      const fixture = TestBed.createComponent(App);
      fixture.detectChanges();

      expect(directiveCount).toBe(1);
      expect(fixture.nativeElement.textContent).toBe('Main: Before  After Slot: foo');
    });
  });
});
