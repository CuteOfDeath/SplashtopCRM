import { Fragment, useEffect, useState } from "react"
import { Button, Container, Dropdown, ListGroup, Nav, Navbar, Offcanvas, Table, Form, InputGroup, Row, Col, Pagination} from "react-bootstrap"
import { Search } from "lucide-react";
import { Link } from "react-router-dom";
import "./styles/bootstrap.min.css";


//Notes for the future when doing any other react project:
//Please for the love of god do not put everything in the same file, create module scripts with exported functions.
//

interface Filter {
    Column : string
    Filter: string
}

type RecordRow = Record<string, string | number | null>

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
    const DISPLAYEDCOLUMNCOUNT = 4

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
    const [currentColumns, setCurrentColumns] = useState<string[]>([])
    const [displayedColumns, setDisplayedColumns] = useState<string[]>([])
    const [mostRecentTable, setMostRecentTable] = useState<string | undefined>(undefined)
    const [activityAddStatus, setActivityAddStatus] = useState<string>("idle")

    const dangerThreshold = new Date().setMonth(new Date().getMonth() - 3)
    const warningThreshold = new Date().setMonth(new Date().getMonth() - 1) // 1 months

    async function loadInitTable() {
        if (currentTable == undefined){
            try {
                const response = await fetch("//127.0.0.1/CRM/api/view_latest_report.php", {
                    method: "GET"
                })
                const data : TableQueryResult = await response.json()
                if (!response.ok || !data.success) {
                throw new Error(data?.error)
                }
                let returned_columns = Object.keys(data.result![0])
                let clamped_columns = returned_columns.slice(0, DISPLAYEDCOLUMNCOUNT)
                setCurrentColumns(returned_columns)
                setDisplayedColumns(clamped_columns)
                setDisplayTable(data.result)
                setCurrentTable(data.table)
                setMostRecentTable(data.table)
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
            setActivityAddStatus("idle")
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
            const data = await response.json()
            if (!response.ok || !data.success) {
                throw new Error(data?.error)
            }
            setCurrentColumns(Object.keys(data.result[0]))
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
            const data = await response.json()
            if (!response.ok || !data.success) {
                throw new Error(data?.error)
            }
            setCurrentColumns(Object.keys(data.result![0]))
            if (table) {
                let returned_columns = Object.keys(data.result![0])
                let clamped_columns = returned_columns.slice(0, DISPLAYEDCOLUMNCOUNT)
                setCurrentColumns(returned_columns)
                setDisplayedColumns(clamped_columns)
            }
            setDisplayTable(data.result)
            setTableRange(localrange)
            setRowCount(data.count)
            setCurrentTable(localtable)
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

    async function handleAddActivity(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        const dateInput = new FormData(e.currentTarget).get("dateInput") as string;
        const timeInput = new FormData(e.currentTarget).get("timeInput") as string;
        const noteInput = new FormData(e.currentTarget).get("noteInput") as string;
        
        try {
                const response = await fetch("//127.0.0.1/CRM/api/set_activity.php", {
                    method: "POST",
                    body: JSON.stringify({
                        name: currentRecordInfo!["Nazwa"],
                        meeting_date: dateInput + " " + timeInput,
                        note: noteInput
                    })
                })
                const data: TableQueryResult = await response.json()
                if (!response.ok || !data.success) {
                throw new Error(data?.error)
                }
            } catch (error) {
                console.error(error)
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

    function evaluateDate(date?: string) {
        if (date) {
            let typedate = Date.parse(date)
            if (typedate <= dangerThreshold) {
                return "table-danger"
            } else if (typedate <= warningThreshold) {
                return "table-warning"
            }
            return "table-light"
        }
    }

    function addAfter(array: string[], index: number, newItem: string) {
    return [
        ...array.slice(0, index),
        newItem,
        ...array.slice(index)
        ];
    }

    function isDateLike(value: string | number | null): value is string {
        if (typeof value !== "string") return false
        return /^\d{4}-\d{2}-\d{2}$/.test(value) || /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)
    }

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>, column: string) => {
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
            <Navbar expand="lg" className="navbar navbar-expand-lg bg-primary" data-bs-theme="dark" style={{borderRadius: "10px", margin: "20px"}}>
                <Container>
                    <Navbar.Brand as={Link} to={"/"}>Cemit CRM</Navbar.Brand>
                    <Navbar.Toggle aria-controls="basic-navbar-nav" />
                    <Navbar.Collapse id="basic-navbar-nav">
                        <Nav className="me-auto">
                            <Nav.Link as={Link} to={"/import"}>Importuj CSV</Nav.Link>
                        </Nav>
                    </Navbar.Collapse>
                </Container>
            </Navbar>
            <Container  style={{margin: "1%", maxWidth: "98%"}}>
                {loading && <p>Ładowanie...</p>}

                {!loading && displayTable && (
                    <>
                        <Container style={{borderRadius:"5px", padding:"1%", marginBottom:"1%"}} className="bg-secondary" fluid>
                            <Row>
                                <Col md="auto">
                                    <Dropdown>
                                        <Dropdown.Toggle variant="primary" id="dropdown-reports">
                                            {currentTable!.replace("data_","")}
                                        </Dropdown.Toggle>
                                        <Dropdown.Menu style={{maxHeight:"300px", overflowY:"scroll"}}>
                                            <Dropdown.Item onClick={() => void reloadTable(undefined, undefined, undefined, mostRecentTable)}>
                                                {mostRecentTable!.replace("data_","")}
                                            </Dropdown.Item>
                                            <Dropdown.Divider/>
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
                                        <InputGroup.Text className="bg-light">Sortuj:</InputGroup.Text>
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
                                            <InputGroup.Text className="bg-light">{rowCount} Rekordów</InputGroup.Text>
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
                                <Col>
                                    <Dropdown>
                                        <Dropdown.Toggle>
                                            Wyświetlane kolumny:
                                        </Dropdown.Toggle>
                                        <Dropdown.Menu>
                                            {currentColumns.map((element, index) => (
                                                <Form key={index}>
                                                    <InputGroup>
                                                        <Form.Check 
                                                        type="switch" 
                                                        checked={displayedColumns.includes(element)} 
                                                        label={element}
                                                        onChange={() => {
                                                            if (displayedColumns.includes(element)){
                                                                setDisplayedColumns(displayedColumns.filter(column => column !== element))
                                                            }else{
                                                                setDisplayedColumns(addAfter(displayedColumns,index -1,element)) 
                                                            }
                                                        }}/> 
                                                    </InputGroup>
                                                </Form>
                                            ))}
                                        </Dropdown.Menu>
                                    </Dropdown>
                                </Col>
                            </Row>
                        </Container>
                        <Table striped bordered hover>
                            <thead>
                                <tr>
                                    {displayedColumns.map((element, index) => (
                                        <Fragment key={index}>
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
                                        </Fragment>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {displayTable.map((row, index) => (
                                    <tr key={index} onClick={() => {
                                        void handleDetailClick(Number(row["id"]))
                                    }} className="table-light">
                                        {displayedColumns.map((element, index) => {
                                            if (isDateLike(row[element])){
                                                return <td key={index} className={evaluateDate(row[element]?.toString())}>{row[element]}</td>
                                            }else{
                                                return <td key={index}>{row[element]}</td>
                                            }
                                        }
                                        )}
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
                                        {Object.keys(currentRecordInfo ?? {}).map((key, index) => (
                                            <ListGroup.Item key={index}>{key}: {currentRecordInfo?.[key]}</ListGroup.Item>
                                        ))}
                                    </ListGroup>
                                    <Form style={{marginTop:"3%", padding:"5%", borderRadius:"5px"}} className="bg-secondary" onSubmit={handleAddActivity}>
                                        <Row style={{marginBottom: "10%", fontWeight: "bold"}}>
                                            <Col>
                                                <Form.Label>Dodaj Aktywność</Form.Label>
                                            </Col>
                                        </Row>
                                        <Row>
                                            <Form.Label>Data umówionej sesji:</Form.Label>
                                        </Row>
                                        <Row>
                                            <Col>
                                                <Form.Control type="date" name="dateInput"/>
                                            </Col>
                                            <Col>
                                                <Form.Control type="time" name="timeInput"/>
                                            </Col>
                                        </Row>
                                        <Row>
                                            <Form.Label>Notatka:</Form.Label>
                                        </Row>
                                        <Row>
                                            <Col>
                                                <Form.Control as="textarea" name="noteInput"/>
                                            </Col>
                                        </Row>
                                        <Row>
                                            <Col>
                                                <Button type="submit" style={{marginTop:"5%"}}>Dodaj</Button>
                                            </Col>
                                        </Row>
                                    </Form>
                                </Offcanvas.Body>
                        </Offcanvas>
                    </>
                )}
            </Container>
        </>
    )
}
