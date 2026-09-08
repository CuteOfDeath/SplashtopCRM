import { Fragment, useEffect, useState } from "react"
import { Button, Container, Dropdown, ListGroup, Nav, Navbar, Offcanvas, Table, Form, InputGroup, Row, Col, Pagination} from "react-bootstrap"
import { Search } from "lucide-react";
import "./styles/bootstrap.min.css";

//TODO: 
//1. Implement the "Ostatnia Sesja" column to light up if last service was 1-3 months ago
//2. Implement a way to add CSV files.
//3. Implement task assigning
//4. Celebrate!


interface RecordRow {
    "ID": number
    "Nazwa": string
    "Nazwa Urządzenia": string
    "Nazwa Klienta": string
    "System Operacyjny": string
    "Wersja Streamera": string
    "Adres IP"?: string
    "Ostatnia Sesja": string
    "Ostatnio Online": string
    "Ostatnio Zalogowany"? : string,
    "Adres IP LAN"? : string
    "Notatka"?: string
}

interface Filter {
    Column : string
    Filter: string
}

interface TableQueryResult {
    success: boolean
    table?: string
    error?: string
    result?: RecordRow[]
    reports?: string[]
    count: number
}

interface PaginationValues {
    current: number
    last: number
}

export default function Dashboard() {
    const DISPLAYEDROWCOUNT = 50
    const [loading, setLoading] = useState<boolean>(true)
    const [tableRange, setTableRange] = useState<[number, number]>([0, DISPLAYEDROWCOUNT])
    const [displayTable, setDisplayTable] = useState<RecordRow[] | undefined>(undefined)
    const [showOffCanvas, setShowOffCanvas] = useState<boolean>(false)
    const [allTables, setAllTables] = useState<string[] | undefined>(undefined)
    const [currentTable, setCurrentTable] = useState<string | undefined>(undefined)
    const [currentRecordInfo, setCurrentRecordInfo] = useState<RecordRow | undefined>(undefined)
    const [currentFilters, setCurrentFilters] = useState<Filter[]>([])
    const [currentSort, setCurrentSort] = useState<boolean>(true) //false = desc, true = asc
    const [currentPos, setCurrentPos] = useState<PaginationValues>()
    const [rowCount, setRowCount] = useState<number>(0)
    const [allowNull, setAllowNull] = useState<boolean>(true)
    const VisibleInfo = ["ID","Nazwa","Nazwa Urządzenia","Nazwa Klienta", "System Operacyjny", "Wersja Streamera", "Ostatnia Sesja", "Ostatnio Online"]
    const propsKeys: (keyof RecordRow)[] = ['Nazwa','Nazwa Urządzenia','Nazwa Klienta','System Operacyjny','Wersja Streamera','Adres IP','Ostatnia Sesja','Ostatnio Online','Ostatnio Zalogowany','Adres IP LAN','Notatka'];

    async function loadInitTable() {
        if (currentTable == undefined){
            try {
                const response = await fetch("//127.0.0.1/CRM/api/view_latest_report.php", {
                    method: "GET"
                })
                const data: TableQueryResult = await response.json()
                if (!response.ok || !data.success) {
                throw new Error(data?.error)
                }
                setDisplayTable(data.result)
                setCurrentTable(data.table)
                setRowCount(data.count)
                handleScrollBar(undefined,data.count)
            } catch (error) {
                console.error(error)
            } finally {
                setLoading(false)
            }
        }
    }

    async function handleDetailClick(id: number) {
        if (!showOffCanvas){
            try {
            const response = await fetch("//127.0.0.1/CRM/api/get_record.php", {
                method: "POST",
                body: JSON.stringify({
                    id: id,
                    table: currentTable
                })
            })
            const data: TableQueryResult = await response.json()
            if (!response.ok || !data.success) {
                throw new Error(data?.error)
            }
            setCurrentRecordInfo(data.result![0])
        } catch (error) {
            console.error(error)
        } finally {
            setShowOffCanvas(true)
        }
        }
    }

    async function loadTable(column : string, filter: string) {
        let thisFilter: Filter = {
            Column: column,
            Filter: filter,
        }
        let localcurrentFilters: Filter[] = [...currentFilters, thisFilter]
        currentFilters.forEach(filter => {
            if(filter.Column == thisFilter.Column){
                if(filter.Filter == thisFilter.Filter){
                    throw new Error("Already filtering for this.")
                }else{
                    localcurrentFilters = [...currentFilters.filter(filter => filter.Column != thisFilter.Column), thisFilter]
                }
            }
        });
        let filteredcolumns: Record<string,string> = {}
        localcurrentFilters.forEach(filters => {
            filteredcolumns[filters.Column as keyof typeof filteredcolumns] = filters.Filter
        });
        setLoading(true)
        try {
            const response = await fetch("//127.0.0.1/CRM/api/get_filtered_report.php", {
                method: "POST",
                body: JSON.stringify({
                    table: currentTable,
                    columns: filteredcolumns,
                    sort: currentSort,
                    range: tableRange,
                    allow_null: allowNull
                })
            })
            const data: TableQueryResult = await response.json()
            if (!response.ok || !data.success) {
                throw new Error(data?.error)
            }
            setDisplayTable(data.result)
            setRowCount(data.count)
            handleScrollBar(undefined,data.count)
            setTableRange([0,DISPLAYEDROWCOUNT])
        } catch (error) {
            console.error(error)
        } finally {
            setCurrentFilters(localcurrentFilters)
            setLoading(false)
        }
    }

    async function reloadTable(sort?:boolean, range?:[number,number],allownull?: boolean, table?: string, fullclean?:boolean) {
        let localsort = sort == undefined? currentSort : sort
        let localrange = range == undefined? tableRange : range
        let localallownul = allownull == undefined? allowNull : allownull
        let localtable = table == undefined? currentTable : table
        let filteredcolumns: Record<string,string> = {}
        if(fullclean){
            setCurrentSort(true)
            setCurrentFilters([])
            setTableRange([0,DISPLAYEDROWCOUNT])
            localsort = true
            localrange = [0,DISPLAYEDROWCOUNT]
        }else{
            currentFilters.forEach(filters => {
                filteredcolumns[filters.Column as keyof typeof filteredcolumns] = filters.Filter
            });
        }
        setLoading(true)
        try {
            const response = await fetch("//127.0.0.1/CRM/api/get_filtered_report.php", {
                method: "POST",
                body: JSON.stringify({
                    table: localtable,
                    columns: filteredcolumns,
                    sort: localsort,
                    range: localrange,
                    allow_null: localallownul
                })
            })
            const data: TableQueryResult = await response.json()
            if (!response.ok || !data.success) {
                throw new Error(data?.error)
            }
            setDisplayTable(data.result)
            setTableRange(localrange)
            setRowCount(data.count)
            if(!range){
                handleScrollBar(undefined,data.count)
            }
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    async function getTables() {
        setLoading(true)
        try {
                const response = await fetch("//127.0.0.1/CRM/api/get_all_reports.php", {
                    method: "GET"
                })
                const data: TableQueryResult = await response.json()
                if (!response.ok || !data.success) {
                throw new Error(data?.error)
                }
                setAllTables(data.reports)
            } catch (error) {
                console.error(error)
            } finally {
                setLoading(false)
            }
    }

    function calculateTableRange(pos: PaginationValues): [number,number] {
        return [DISPLAYEDROWCOUNT * pos.current,  DISPLAYEDROWCOUNT * pos.current + DISPLAYEDROWCOUNT]
    }

    function handleScrollBar(movement?: string, rowCount?: number){
        if(movement && currentPos != undefined){
            switch(movement){
                case("prev"):
                    let prevvalue = (currentPos!.current - 1 <= 0)? 0 : currentPos!.current - 1
                    let prevPos = {
                        current: prevvalue,
                        last: currentPos!.last
                    }
                    setCurrentPos(prevPos)
                    reloadTable(undefined,calculateTableRange(prevPos))
                    break
                    
                case("next"):
                    let nextvalue = (currentPos!.current + 1 >= currentPos.last)?  currentPos!.last : currentPos!.current + 1
                    let nextPos: PaginationValues = {
                        current: nextvalue,
                        last: currentPos!.last
                    }
                    setCurrentPos(nextPos)
                    reloadTable(undefined,calculateTableRange(nextPos))
                    break

                case("last"):
                    let lastPos: PaginationValues = {
                        current: currentPos!.last,
                        last: currentPos!.last
                    }
                    setCurrentPos(lastPos)
                    reloadTable(undefined,calculateTableRange(lastPos))
                    break

                case("first"):
                    let firstPos: PaginationValues = {
                        current: 0,
                        last: currentPos!.last
                    }
                    setCurrentPos(firstPos)
                    reloadTable(undefined,calculateTableRange(firstPos))
                    break
            }
        }else{
            if(rowCount){
                let pageAmount = Math.ceil(rowCount / DISPLAYEDROWCOUNT) - 1
                let newPos: PaginationValues = {
                    current: 0,
                    last: pageAmount,
                }
                setRowCount(rowCount)  
                setCurrentPos(newPos)
            }
        }
    }

    function handleDetailHide(){
        setShowOffCanvas(false)
    }

    const handleSubmit = (e: React.SubmitEvent<HTMLFormElement>, column: string) => {
        e.preventDefault()
        const input = new FormData(e.currentTarget).get("filterInput") as string;
        void loadTable(column, input)
    }

    const checkForFilterValues = (element: string): string => {
    return currentFilters.find((filter) => filter.Column === element)?.Filter ?? ""
    }

    // fetch once on mount
    useEffect(() => {
        if (!displayTable) {
            void loadInitTable()
        }
        if (!allTables) {
            void getTables()
        }
    }, [])

    return (
        <>
            <Navbar expand="lg" className="navbar navbar-expand-lg bg-primary" data-bs-theme="dark" style={{borderRadius:"10px", margin:"20px"}}>
                <Container>
                    <Navbar.Brand href="#">Cemit CRM</Navbar.Brand>
                    <Navbar.Toggle aria-controls="basic-navbar-nav" />
                    <Navbar.Collapse id="basic-navbar-nav">
                        <Nav className="me-auto">
                            <Nav.Link href="#">Importuj CSV</Nav.Link>
                            <Nav.Link href="#">Dodaj Aktywność</Nav.Link>
                        </Nav>
                    </Navbar.Collapse>
                </Container>
            </Navbar>
            <Container  style={{margin: "1%", maxWidth: "98%"}}>
                {loading && <p>Ładowanie...</p>}

                {!loading && displayTable && (
                    <>
                        <Container style={{borderRadius:"5px", padding:"1%", marginBottom:"1%"}} className="bg-light" fluid>
                            <Row>
                                <Col md="auto">
                                    <Dropdown>
                                        <Dropdown.Toggle variant="primary" id="dropdown-reports">
                                            {currentTable!.replace("data_","") || "Wybierz raport"}
                                        </Dropdown.Toggle>
                                        <Dropdown.Menu>
                                            {allTables?.map((table, index) => (
                                                <Dropdown.Item 
                                                    key={index} 
                                                    onClick={() => void reloadTable(undefined, undefined, undefined, table)}
                                                >
                                                    {table.replace("data_","")}
                                                </Dropdown.Item>
                                            ))}
                                        </Dropdown.Menu>
                                    </Dropdown>
                                </Col>
                                <Col md="auto">
                                    <Button variant="danger" onClick={() => reloadTable(undefined,undefined,undefined,undefined,true)}>Wyczyść Filtry</Button>
                                </Col>
                                <Col md="auto">
                                    <InputGroup>
                                        <InputGroup.Text className="bg-secondary">Sortuj:</InputGroup.Text>
                                        <Button variant="outline-primary" onClick={() => {
                                            void reloadTable(true)
                                            setCurrentSort(true)
                                            }} active={currentSort === true}>Rosnąco</Button>
                                        <Button variant="outline-primary" onClick={() => {
                                            void reloadTable(false)
                                            setCurrentSort(false)
                                            }} active={currentSort === false}>Malejąco</Button>
                                    </InputGroup>
                                </Col>
                                <Col md="auto">
                                    <Pagination>
                                        <Pagination.First onClick={() => handleScrollBar("first")}/>
                                        <Pagination.Prev onClick={() => handleScrollBar("prev")}/>

                                        <Pagination.Item>{currentPos!.current + 1}/{currentPos!.last + 1}</Pagination.Item>

                                        <Pagination.Next onClick={() => handleScrollBar("next")}/>
                                        <Pagination.Last onClick={() => handleScrollBar("last")}/>
                                    </Pagination>
                                </Col>
                                <Col md="auto">
                                    <InputGroup>
                                            <InputGroup.Text className="bg-secondary">{rowCount} Rekordów</InputGroup.Text>
                                    </InputGroup>
                                </Col>
                                <Col md="auto">
                                    <InputGroup>
                                            <InputGroup.Checkbox checked={allowNull} onChange={() => {
                                                void reloadTable(undefined,undefined,!allowNull)
                                                setAllowNull(!allowNull)
                                            }}/>
                                            <InputGroup.Text>Wyświetlaj puste wartości</InputGroup.Text>
                                    </InputGroup>
                                </Col>
                            </Row>
                        </Container>
                        <Table striped bordered hover>
                            <thead>
                                <tr>
                                    {VisibleInfo.map((element, index) => (
                                        <Fragment key={index}>
                                            {element != "ID" && (
                                            <th>
                                                <Dropdown autoClose="outside">
                                                    {(checkForFilterValues(element) == "") ? 
                                                    <Dropdown.Toggle variant="success" id="search-dropdown">
                                                        {element}
                                                    </Dropdown.Toggle> :  
                                                    <Dropdown.Toggle variant="danger" id="search-dropdown">
                                                        {element}
                                                    </Dropdown.Toggle>}

                                                    <Dropdown.Menu className="p-2" style={{ minWidth: "280px" }}>
                                                        <Form onSubmit={(e) => handleSubmit(e,element)} id={element}>
                                                        <InputGroup>
                                                            <Form.Control
                                                            type="text"
                                                            placeholder="Wyszukaj..."
                                                            autoFocus
                                                            name="filterInput"
                                                            defaultValue={checkForFilterValues(element)}
                                                            />
                                                            <Button type="submit" variant="primary">
                                                            <Search size={16} />
                                                            </Button>
                                                        </InputGroup>

                                                        </Form>
                                                    </Dropdown.Menu>
                                                </Dropdown>
                                            </th>
                                            )}
                                            {element == "ID" && (
                                                <th>
                                                    <Button variant="success">ID</Button>
                                                </th>
                                            )}
                                        </Fragment>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {displayTable.map((row, index) => (
                                    <tr key={index} onClick={() => {
                                        void handleDetailClick(row["ID"])
                                    }} className="table-light">
                                        {VisibleInfo.map((element, index) => (
                                            <td key={index}>{row[element as keyof RecordRow]}</td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                        <Offcanvas show={showOffCanvas} onHide={handleDetailHide}>
                                <Offcanvas.Header closeButton>
                                    <Offcanvas.Title>{currentRecordInfo?.Nazwa}</Offcanvas.Title>
                                </Offcanvas.Header>
                                <Offcanvas.Body>
                                    <ListGroup>
                                        {propsKeys.map((key, index) => (
                                            <ListGroup.Item key={index}>{key}: {currentRecordInfo?.[key]}</ListGroup.Item>
                                        ))}
                                    </ListGroup>
                                </Offcanvas.Body>
                        </Offcanvas>
                    </>
                )}
            </Container>
        </>
    )
}
