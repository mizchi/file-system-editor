import React, {
  useEffect,
  useState,
  createContext,
  useContext,
  useCallback,
} from "react";

type EditorState = {
  rootHandle: FileSystemDirectoryHandle | null;
  activeFileHandle: FileSystemFileHandle | null;
  setRootHandle: (rootHandle: FileSystemDirectoryHandle | null) => void;
  setActiveFileHandle: (activeFileHandle: FileSystemFileHandle | null) => void;
};

const EditorContext = createContext<EditorState>(null as any);

function EditorProvider(props: { children: React.ReactNode }) {
  const [rootHandle, setRootHandle] =
    useState<FileSystemDirectoryHandle | null>(null);
  const [activeFileHandle, setActiveFileHandle] =
    useState<FileSystemFileHandle | null>(null);

  const editorState: EditorState = {
    rootHandle,
    activeFileHandle,
    setRootHandle,
    setActiveFileHandle,
  };
  return (
    <div>
      <EditorContext.Provider value={editorState}>
        {props.children}
      </EditorContext.Provider>
    </div>
  );
}

export default function App() {
  return (
    <EditorProvider>
      <_App />
    </EditorProvider>
  );
}

function _App() {
  const { rootHandle, setRootHandle, activeFileHandle } =
    useContext(EditorContext);

  if (rootHandle == null) {
    return (
      <div>
        <button
          style={{}}
          onClick={async () => {
            const dirHandle = await window.showDirectoryPicker({
              title: "Select project root",
            });
            await dirHandle.requestPermission({
              mode: "readwrite",
            });
            setRootHandle(dirHandle);
          }}
        >
          Select project
        </button>
      </div>
    );
  }
  return (
    <div style={{ width: "100vw", height: "100vh", display: "flex" }}>
      <div style={{ minWidth: "200px" }}>
        <div style={{ fontFamily: "menlo, monospace" }}>
          {rootHandle && (
            <DirectoryTree name="<root>" handle={rootHandle} depth={0} />
          )}
        </div>
      </div>
      <div
        style={{
          width: "calc(100vw - 200px)",
          height: "100vh",
          overflow: "hidden",
        }}
      >
        {activeFileHandle && <FileEditor handle={activeFileHandle} />}
      </div>
    </div>
  );
}

function FileEditor(props: { handle: FileSystemFileHandle }) {
  const [content, setContent] = useState<string>("");
  const [lastSavedContent, setLastSavedContent] = useState<string>("");

  const onInput = useCallback(
    (ev: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // @ts-ignore
      const value = ev.target.value;
      setContent(value);
    },
    []
  );

  const onPress = useCallback(
    (ev: React.KeyboardEvent) => {
      console.log("ev.key", ev.key, ev.metaKey, ev.metaKey);
      if (ev.key === "s" && ev.metaKey) {
        ev.preventDefault();
        console.log("saved");

        Promise.resolve()
          .then(async () => {
            const writer = await props.handle.createWritable();
            await writer.write(content);
            await writer.close();
            setLastSavedContent(content);
            console.log("saved");
          })
          .catch(console.error);
      }
    },
    [content]
  );

  useEffect(() => {
    (async () => {
      const file = await props.handle.getFile();
      const content = await file.text();
      setContent(content);
      setLastSavedContent(content);
    })();
  }, [props.handle]);
  const dirty = content !== lastSavedContent;

  return (
    <div style={{ width: "100%", height: "98%" }}>
      <div style={{ height: "1.5rem" }}>
        {dirty ? "*" : ""}
        {props.handle.name}
      </div>
      <div
        style={{
          height: "calc(98% - 1rem)",
          overflow: "hidden",
        }}
      >
        <textarea
          onKeyDown={onPress}
          style={{
            padding: 10,
            height: "97%",
            width: "97%",
            resize: "none",
            fontSize: "1.1rem",
            outline: "none",
            background: "#fafafa",
          }}
          value={content}
          onInput={onInput}
        />
      </div>
    </div>
  );
}

function DirectoryTree(props: {
  name: string;
  handle: FileSystemDirectoryHandle;
  depth: number;
}) {
  const { setActiveFileHandle } = useContext(EditorContext);
  const { handle } = props;
  const [entries, setEntries] = useState<null | Array<
    [fpath: string, handle: FileSystemHandle]
  >>(null);
  const [opened, setOpened] = useState(
    props.depth === 0 && !["node_modules"].includes(props.name)
  );
  useEffect(() => {
    (async () => {
      const entries: Array<[fpath: string, handle: FileSystemHandle]> = [];
      for await (const [fpath, fileHandle] of handle.entries()) {
        entries.push([fpath, fileHandle]);
      }
      entries.sort((a, b) => (a[1].kind === "file" ? 1 : -1));
      setEntries(entries);
    })();
  }, [opened]);
  if (entries == null) return <>...</>;
  return (
    <div>
      <div onClick={() => setOpened(!opened)} style={{ cursor: "pointer" }}>
        {opened ? "[+]" : "[-]"} {props.name}
      </div>
      {opened && (
        <div style={{ paddingLeft: "1.5rem" }}>
          {[...entries].map(([fpath, handle]) => {
            if (handle.kind === "file") {
              return (
                <div
                  key={fpath}
                  onClick={() => {
                    setActiveFileHandle(handle);
                  }}
                  style={{ cursor: "pointer" }}
                >
                  {fpath}
                </div>
              );
            } else {
              return (
                <DirectoryTree
                  key={fpath}
                  handle={handle}
                  depth={props.depth + 1}
                  name={fpath}
                />
              );
            }
          })}
        </div>
      )}
    </div>
  );
}
