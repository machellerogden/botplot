<script>
    import SvelteMarkdown from 'svelte-markdown';

    import Code from './Code.svelte';
    import Table from './Table.svelte';
    import TableRow from './TableRow.svelte';
    import TableCell from './TableCell.svelte';
    import TableHead from './TableHead.svelte';
    import TableBody from './TableBody.svelte';
    import Blockquote from './Blockquote.svelte';
    import Br from './Br.svelte';
    import Codespan from './Codespan.svelte';
    import Del from './Del.svelte';
    import Em from './Em.svelte';
    import Heading from './Heading.svelte';
    import Hr from './Hr.svelte';
    import Html from './Html.svelte';
    import Image from './Image.svelte';
    import Link from './Link.svelte';
    import List from './List.svelte';
    import ListItem from './ListItem.svelte';
    import Paragraph from './Paragraph.svelte';
    import Strong from './Strong.svelte';
    import Text from './Text.svelte';

    export let source =`
# Some Example Markdown

\`\`\`mermaid
sequenceDiagram
    Alice ->> Bob: Hello Bob, how are you?
    Bob-->>John: How about you John?
    Bob--x Alice: I am good thanks!
    Bob-x John: I am good thanks!
    Note right of John: Bob thinks a long<br/>long time, so long<br/>that the text does<br/>not fit on a row.

    Bob-->Alice: Checking with John...
    Alice->John: Yes... John, how are you?
\`\`\`
`;
</script>

<SvelteMarkdown {source}
    renderers={{
        code: Code,
        table: Table,
        tablerow: TableRow,
        tablecell: TableCell,
        tablehead: TableHead,
        tablebody: TableBody,
        blockquote: Blockquote,
        br: Br,
        codespan: Codespan,
        del: Del,
        em: Em,
        heading: Heading,
        hr: Hr,
        html: Html,
        image: Image,
        link: Link,
        list: List,
        listitem: ListItem,
        paragraph: Paragraph,
        strong: Strong,
        text: Text
    }}
/>
