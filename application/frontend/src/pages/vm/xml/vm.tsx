import StandardLayout from '@/components/layout/standard-layout';
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarShortcut,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
} from '@/components/shadcn/ui/menubar';
import { useAsyncEffect } from '@/lib/react-utils';
import { downloadFile } from '@/lib/utils';
import { client } from '@/trpc-client';
import Editor, { useMonaco, OnMount } from '@monaco-editor/react';
import { editor } from 'monaco-editor';
import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
export default function XmlVm() {
  const { id } = useParams();
  if (!id) throw new Error(); //Should not happen. Otherwise useNavigate()('/vm');

  const [xml, setXml] = useState('');
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const height = window.innerHeight + 'px';
  useAsyncEffect(async function () {
    setXml(await client.vm.getXml.query({ name: id }));
  }, []);
  useEffect(
    function () {
      if (!editorRef.current) return;
      editorRef.current.setValue(xml);
    },
    [xml]
  );
  return (
    <StandardLayout>
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>File</MenubarTrigger>
          <MenubarContent>
            <MenubarItem
              onClick={async () => {
                setXml(await client.vm.getXml.query({ name: id }));
              }}
            >
              Reload <MenubarShortcut>Ctrl + O</MenubarShortcut>
            </MenubarItem>
            <MenubarItem
              onClick={async () => {
                try {
                  if (!editorRef.current)
                    throw new Error('Editor not referred.');
                  await client.vm.setXml.mutate({
                    name: id,
                    xml: editorRef.current.getValue(),
                  });
                } catch (exc) {
                  //TODO: Show Toast!
                  console.error(exc);
                }
              }}
            >
              Save <MenubarShortcut>Ctrl + S</MenubarShortcut>
            </MenubarItem>
            <MenubarItem
              onClick={() => {
                if (!editorRef.current) return;
                downloadFile(id + '.xml', editorRef.current.getValue());
              }}
            >
              Download <MenubarShortcut>Ctrl + Shift + S</MenubarShortcut>
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>
      <Editor
        height={height}
        defaultLanguage="xml"
        defaultValue={xml}
        onMount={(editor) => {
          editorRef.current = editor;
        }}
        theme={
          document.documentElement.classList.contains('dark')
            ? 'vs-dark'
            : 'light'
        }
      ></Editor>
    </StandardLayout>
  );
}
