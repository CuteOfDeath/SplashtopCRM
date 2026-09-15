import { Fragment, useEffect, useState } from "react"
import { Button, Container, Dropdown, Nav, Navbar, Offcanvas, Table, Form, InputGroup, Row, Col, Pagination, Card, ToastContainer, Toast} from "react-bootstrap"
import { Search } from "lucide-react";
import { Link } from "react-router-dom";
import "./styles/bootstrap.min.css";


//Notes for the future when doing any other react project:
//Please for the love of god do not put everything in the same file, create module scripts with exported functions.
//

//TODO: Figure out how to subsitute the values of one column for a another. ughghghgh

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

interface ActivityRecords {
    "id" : number
    "Nazwa" : string,
    "Data Dodania": string,
    "Data Umówiona" : string,
    "Notatka" : string
    "Odznaczone" : boolean
}

interface ActivityRecordResult {
    success: boolean,
    error?: string,
    result?: ActivityRecords[]
}

interface PaginationValues {
    current: number
    last: number
}

const API_BASE = `${import.meta.env.BASE_URL}/crmapi`

export default function Dashboard() {
    const DISPLAYEDROWCOUNT = 50
    const DEFAULTCOLUMNS = ["id", "Nazwa", "Nazwa Urządzenia", "Nazwa Klienta", "Ostatnia Sesja", "Data Umówiona", "Notatka"]


    const [loading, setLoading] = useState<boolean>(true)
    const [tableRange, setTableRange] = useState<[number, number]>([0, DISPLAYEDROWCOUNT])
    const [displayTable, setDisplayTable] = useState<RecordRow[] | undefined>(undefined)
    const [showOffCanvas, setShowOffCanvas] = useState<boolean>(false)
    const [allTables, setAllTables] = useState<string[] | undefined>(undefined)
    const [currentTable, setCurrentTable] = useState<string | undefined>(undefined)
    const [currentRecordInfo, setCurrentRecordInfo] = useState<RecordRow | undefined>(undefined)
    const [currentRecordActivity, setCurrentRecordActivity] = useState<ActivityRecords[] | undefined>(undefined)
    const [currentFilters, setCurrentFilters] = useState<Filter[]>([])
    const [currentSort, setCurrentSort] = useState<boolean>(true) //false = desc, true = asc
    const [currentPos, setCurrentPos] = useState<PaginationValues>()
    const [rowCount, setRowCount] = useState<number>(0)
    const [allowNull, setAllowNull] = useState<boolean>(true)
    const [currentColumns, setCurrentColumns] = useState<string[]>([])
    const [displayedColumns, setDisplayedColumns] = useState<string[]>([])
    const [mostRecentTable, setMostRecentTable] = useState<string | undefined>(undefined)
    const [activityAddStatus, setActivityAddStatus] = useState<string>("idle")
    const [OrderedColumns, setOrderedColumns] = useState<string[]>([])
    const [currentAlerts, setCurrentAlerts] = useState<ActivityRecords[]>([])
    const [hiddenAlerts, setHiddenAlerts] = useState<number[]>([])
    const [, setTimeTick] = useState(0) // bumped periodically to refresh relative-time labels

    const dangerThreshold = new Date().setMonth(new Date().getMonth() - 3) // 3 months
    const warningThreshold = new Date().setMonth(new Date().getMonth() - 1) // 1 months

    const activityDangerThreshold = new Date().setHours(new Date().getHours() + 1) //in 1 hour
    const activityWarningThreshold = new Date().setHours(new Date().getHours() + 24) //in a day

    async function loadInitTable() {
        if (currentTable == undefined){
            try {
                const response = await fetch(`${API_BASE}/view_latest_report.php`, {
                    method: "GET"
                })
                const data : TableQueryResult = await response.json()
                if (!response.ok || !data.success) {
                throw new Error(data?.error)
                }
                let returned_columns = Object.keys(data.result![0])
                setCurrentColumns(returned_columns)
                setDisplayedColumns(DEFAULTCOLUMNS)
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

    async function handleDetailClick(id: number, name: string) {
        if (!showOffCanvas){
            try {
                const response = await fetch(`${API_BASE}/get_record.php`, {
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
            }
            try {
                const response = await fetch(`${API_BASE}/get_all_activity.php`, {
                    method: "POST",
                    body: JSON.stringify({
                        name: name
                    })
                })
                const data: ActivityRecordResult = await response.json()
                if (!response.ok || !data.success) {
                    throw new Error(data?.error)
                }
                setCurrentRecordActivity(data.result)
            }catch (error){
                console.error(error)
            }finally{
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
                    console.log("already filtering for this")
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
            const response = await fetch(`${API_BASE}/get_filtered_report.php`, {
                method: "POST",
                body: JSON.stringify({
                    table: currentTable,
                    columns: filteredcolumns,
                    sort: currentSort,
                    range: tableRange,
                    allow_null: allowNull,
                    orderby: OrderedColumns
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
        let localorderedcolumns = OrderedColumns
        if(fullclean){
            setCurrentSort(true)
            setCurrentFilters([])
            setTableRange([0,DISPLAYEDROWCOUNT])
            setOrderedColumns([])
            localorderedcolumns = []
            localsort = true
            localrange = [0,DISPLAYEDROWCOUNT]
        }else{
            currentFilters.forEach(filters => {
                filteredcolumns[filters.Column as keyof typeof filteredcolumns] = filters.Filter
            });
        }
        setLoading(true)
        try {
            const response = await fetch(`${API_BASE}/get_filtered_report.php`, {
                method: "POST",
                body: JSON.stringify({
                    table: localtable,
                    columns: filteredcolumns,
                    sort: localsort,
                    range: localrange,
                    allow_null: localallownul,
                    orderby: localorderedcolumns
                })
            })
            const data = await response.json()
            if (!response.ok || !data.success) {
                throw new Error(data?.error)
            }
            setCurrentColumns(Object.keys(data.result![0]))
            if (table) {
                let returned_columns = Object.keys(data.result![0])
                setCurrentColumns(returned_columns)
                setDisplayedColumns(DEFAULTCOLUMNS)
            }
            setDisplayTable(data.result)
            setTableRange(localrange)
            setRowCount(data.count)
            setCurrentTable(localtable)
            if(!range || sort){
                handleScrollBar(undefined, data.count, !(fullclean || table))
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
                const response = await fetch(`${API_BASE}/get_all_reports.php`, {
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
        setActivityAddStatus("loading")
        try {
                const response = await fetch(`${API_BASE}/set_activity.php`, {
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
                setActivityAddStatus("success")
                reloadTable()
            } catch (error) {
                setActivityAddStatus("error")
                console.error(error)
            }
    }

    async function handleActivityRealization(checked: boolean, id : number) {
        if (!checked) {
            if (confirm("Czy napewno chcesz oznaczyć tą aktywność jako zrealizowaną?")){
                try {
                const response = await fetch(`${API_BASE}/mark_as_realized.php`, {
                    method: "POST",
                    body: JSON.stringify({
                        id : id
                    })
                })
                const data: TableQueryResult = await response.json()
                if (!response.ok || !data.success) {
                throw new Error(data?.error)
                }
                setShowOffCanvas(false)
                reloadTable()
            } catch (error) {
                console.error(error)
            }
            }
        }
    }

    async function getAlerts() {
        let currentalertids: number[] = []
        currentAlerts.forEach((element) => {
            currentalertids.push(element["id"])
        })
        try {
            const response = await fetch(`${API_BASE}/check_for_alerts.php`, {
                method: "POST",
                body: JSON.stringify({
                    ids : currentalertids
                })
            })
            const data: ActivityRecordResult = await response.json()
            if (!response.ok || !data.success) {
            throw new Error(data?.error)
            }
            const newRows = (data.result ?? []).filter(
                row => !currentAlerts.some(element => element["id"] === row["id"])
            )
            if (newRows.length > 0) {
                setCurrentAlerts([...currentAlerts, ...newRows])
            }
        } catch (error) {
            console.error(error)
        }
    }

    function polishPluralForm(count: number, forms: [string, string, string]): string {
    if (count === 1) return forms[0]
    const lastDigit = count % 10
    const lastTwoDigits = count % 100
    if (lastDigit >= 2 && lastDigit <= 4 && !(lastTwoDigits >= 12 && lastTwoDigits <= 14)) {
        return forms[1]
    }
    return forms[2]
    }

    function getRelativeTimeString(dateString: string): string {
        const target = new Date(dateString.replace(" ", "T"))
        const diffSeconds = Math.round((target.getTime() - Date.now()) / 1000)
        const absSeconds = Math.abs(diffSeconds)

        const units: [[string, string, string], number][] = [
            [["rok", "lata", "lat"], 60 * 60 * 24 * 365],
            [["miesiąc", "miesiące", "miesięcy"], 60 * 60 * 24 * 30],
            [["tydzień", "tygodnie", "tygodni"], 60 * 60 * 24 * 7],
            [["dzień", "dni", "dni"], 60 * 60 * 24],
            [["godzina", "godziny", "godzin"], 60 * 60],
            [["minuta", "minuty", "minut"], 60],
        ]

        for (const [forms, unitSeconds] of units) {
            if (absSeconds >= unitSeconds) {
                const value = Math.round(absSeconds / unitSeconds)
                const label = `${value} ${polishPluralForm(value, forms)}`
                return diffSeconds > 0 ? `za ${label}` : `${label} temu`
            }
        }

        return diffSeconds > 0 ? "za mniej niż minutę" : "przed chwilą"
    }


    function calculateTableRange(pos: PaginationValues): [number,number] {
        return [DISPLAYEDROWCOUNT * pos.current,  DISPLAYEDROWCOUNT * pos.current + DISPLAYEDROWCOUNT]
    }

    function handleScrollBar(movement?: string, rowCount?: number, preserveCurrent?: boolean){
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
                setRowCount(rowCount)
                setCurrentPos(prev => ({
                    current: (preserveCurrent && prev) ? Math.min(prev.current, pageAmount) : 0,
                    last: pageAmount,
                }))
            }
        }
    }

    function handleDetailHide(){
        setShowOffCanvas(false)
    }

    function evaluateDate(date?: string, elementName?: string) {
        if (date) {
            if (elementName != "Data Umówiona" && elementName != "Notatka"){
                let typedate = Date.parse(date)
                if (typedate <= dangerThreshold) {
                    return "table-danger"
                } else if (typedate <= warningThreshold) {
                    return "table-warning"
                }
                return "table-light"
            }else{
                let typedate = Date.parse(date)
                if (typedate <= activityDangerThreshold) {
                    return "table-danger"
                } else if (typedate <= activityWarningThreshold) {
                    return "table-warning"
                }
                return "table-light"
            }
        }
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

    useEffect(() => {
        const timeTickInterval = setInterval(() => setTimeTick(tick => tick + 1), 5000)
        return () => clearInterval(timeTickInterval)
    }, [])

    // fetch once on mount
    useEffect(() => {
        if (!displayTable) {
            void loadInitTable()
        }
        if (!allTables) {
            void getTables()
        }
        if(currentAlerts.length == 0){
            getAlerts()
        }
        setInterval(() => {
            getAlerts()
        }, 5000);
    }, [])

    return (
        <>
            <Navbar expand="lg" className="navbar navbar-expand-lg bg-primary" data-bs-theme="dark" style={{borderRadius: "10px", margin: "20px"}}>
                <Container>
                    <Navbar.Brand as={Link} to={`${import.meta.env.BASE_URL}/`}>Cemit CRM</Navbar.Brand>
                    <Navbar.Toggle aria-controls="basic-navbar-nav" />
                    <Navbar.Collapse id="basic-navbar-nav">
                        <Nav className="me-auto">
                            <Nav.Link as={Link} to={`${import.meta.env.BASE_URL}/import`}>Importuj CSV</Nav.Link>
                        </Nav>
                    </Navbar.Collapse>
                </Container>
            </Navbar>
            <Container  style={{margin: "1%", maxWidth: "98%"}}>
                {loading && <p>Ładowanie...</p>}

                {!loading && displayTable && (
                    <>
                        {(currentAlerts.length != 0 && !(hiddenAlerts.length >= currentAlerts.length)) && (
                            <Container style={{borderRadius: "5px", padding:"1%", backgroundColor:"#FFEB9E", marginBottom: "1%"}} fluid>
                            <h3 style={{color:"black", marginBottom: "1%"}}>Najbliższe spotkania:</h3>
                                <ToastContainer className="position-static d-flex flex-row flex-wrap gap-2 mb-2">
                                    {currentAlerts.map((alert) => (
                                        <Toast key={alert.id} show={!(hiddenAlerts.includes(alert.id))} onClose={() => {
                                            setHiddenAlerts([...hiddenAlerts, alert.id])
                                            }}>
                                            <Toast.Header>
                                                <strong className="me-auto">{alert.Nazwa}</strong>
                                                <small>{getRelativeTimeString(alert["Data Umówiona"])}</small>
                                            </Toast.Header>
                                            <Toast.Body>
                                                Notatka: {alert.Notatka || "Brak notatki"}
                                            </Toast.Body>
                                        </Toast>
                                    ))}
                                </ToastContainer>
                            </Container>
                        )}
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
                                            <InputGroup.Text>Pokazuj NULL przy filtrowaniu</InputGroup.Text>
                                    </InputGroup>
                                </Col>
                                <Col>
                                    <Dropdown>
                                        <Dropdown.Toggle>
                                            Wyświetlane kolumny:
                                        </Dropdown.Toggle>
                                        <Dropdown.Menu style={{padding:"10px", maxWidth:"500px"}}>
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
                                                                setDisplayedColumns(currentColumns.filter(col => col === element || displayedColumns.includes(col)))
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
                                                            <Row>
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
                                                            </Row>
                                                            <Row>
                                                                <InputGroup>
                                                                    <InputGroup.Checkbox checked={OrderedColumns.includes(element)} onChange={() => {
                                                                        if (OrderedColumns.includes(element)){
                                                                            setOrderedColumns(OrderedColumns.filter(column => column !== element))
                                                                        }else{
                                                                            setOrderedColumns([...OrderedColumns, element])
                                                                        }
                                                                    }}/>
                                                                    <InputGroup.Text>Sortuj Kolumną</InputGroup.Text>
                                                                </InputGroup>
                                                            </Row>
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
                                        void handleDetailClick(Number(row["id"]),String(row["Nazwa"]))
                                    }} className="table-light">
                                        {displayedColumns.map((element, index) => {
                                            if (isDateLike(row[element])){
                                                return <td key={index} className={evaluateDate(row[element]?.toString(),element)}>{row[element]}</td>
                                            }else{
                                                return <td key={index}>{row[element]}</td>
                                            }
                                        }
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </>
                )}
                <Offcanvas show={showOffCanvas} onHide={handleDetailHide}>
                                <Offcanvas.Header closeButton>
                                    <Offcanvas.Title>{currentRecordInfo?.Nazwa}</Offcanvas.Title>
                                </Offcanvas.Header>
                                <Offcanvas.Body>
                                    {/* <ListGroup>
                                        {Object.keys(currentRecordInfo ?? {}).map((key, index) => (
                                            <ListGroup.Item key={index}>{key}: {currentRecordInfo?.[key]}</ListGroup.Item>
                                        ))}
                                    </ListGroup> uncomment this if the detail listing is actually in any way useful. As of right now its redundant. */}
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
                                                <Button type="submit" style={{marginTop:"5%"}} disabled={activityAddStatus == "loading"}>Dodaj</Button>
                                            </Col>
                                            <Col>
                                                {(activityAddStatus == "error") && <p style={{color:"red"}}>Coś poszło nie tak, sprawdź konsole.</p>}
                                                {(activityAddStatus == "success") && <p style={{color:"green"}}>Aktywność dodana pomyślnie!</p>}
                                            </Col>
                                        </Row>
                                    </Form>
                                    <Container style={{marginTop:"20px"}}>
                                        <h3>Historia Aktywności:</h3>
                                        {currentRecordActivity?.map((activity : ActivityRecords) => (
                                            <Card style={activity["Odznaczone"] ? {marginTop:"20px", opacity:"70%"} : {marginTop:"20px"}}>
                                                <Card.Header>Data Dodania: {activity["Data Dodania"]}</Card.Header>
                                                <Card.Body>
                                                    <Card.Title>{activity["Nazwa"]}</Card.Title>
                                                    <Card.Text>
                                                        Data Umówiona: {activity["Data Umówiona"]}<br/>
                                                        Notatka: {activity["Notatka"]}
                                                    </Card.Text>
                                                    <InputGroup>
                                                        <InputGroup.Checkbox checked={activity["Odznaczone"]} onChange={() => handleActivityRealization(activity["Odznaczone"],activity["id"])}/>
                                                        <InputGroup.Text>Zrealizowane</InputGroup.Text>
                                                    </InputGroup>
                                                </Card.Body>
                                            </Card>
                                        ))}
                                    </Container>
                            </Offcanvas.Body>
                    </Offcanvas>
            </Container>
        </>
    )
}
