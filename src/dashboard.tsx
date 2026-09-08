import { Fragment, useEffect, useState } from "react"
import { Button, Container, Dropdown, ListGroup, Nav, Navbar, Offcanvas, Table, Form, InputGroup, Row, Col, Pagination } from "react-bootstrap"
import { Search } from "lucide-react";
import "./styles/bootstrap.min.css";

//TODO: Implement form controls. Implement a way to upload CSV files. Implement task assigning.


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
}

export default function Dashboard() {
    const [loading, setLoading] = useState<boolean>(true)
    const [tableRange, setTableRange] = useState<[number, number]>([0, 50])
    const [displayTable, setDisplayTable] = useState<RecordRow[] | undefined>(undefined)
    const [showOffCanvas, setShowOffCanvas] = useState<boolean>(false)
    const [currentTable, setCurrentTable] = useState<string | undefined>(undefined)
    const [currentRecordInfo, setCurrentRecordInfo] = useState<RecordRow | undefined>(undefined)
    const [currentFilters, setCurrentFilters] = useState<Filter[]>([])
    const [currentSort, setCurrentSort] = useState<boolean>(true) //false = desc, true = asc
    const VisibleInfo = ["ID","Nazwa","Nazwa Urządzenia","Nazwa Klienta", "System Operacyjny", "Wersja Streamera", "Ostatnia Sesja", "Ostatnio Online"]
    const propsKeys: (keyof RecordRow)[] = ['Nazwa','Nazwa Urządzenia','Nazwa Klienta','System Operacyjny','Wersja Streamera','Adres IP','Ostatnia Sesja','Ostatnio Online','Ostatnio Zalogowany','Adres IP LAN','Notatka'];

    async function loadInitTable() {
        if (currentTable == undefined){
            try {
                const response = await fetch("//127.0.0.1/CRM/api/view_latest_report.php", {
                    method: "GET"
                })
                const data: TableQueryResult = await response.json()
                setDisplayTable(data.result)
                setCurrentTable(data.table)
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
            const response = await fetch("//127.0.0.1/CRM/api/get_filtered_table.php", {
                method: "POST",
                body: JSON.stringify({
                    table: currentTable,
                    columns: filteredcolumns,
                    sort: currentSort,
                    range: tableRange,
                })
            })
            const data: TableQueryResult = await response.json()
            if (!response.ok || !data.success) {
                throw new Error(data?.error)
            }
            console.log(data)
            setDisplayTable(data.result)
        } catch (error) {
            console.error(error)
        } finally {
            setCurrentFilters(localcurrentFilters)
            setLoading(false)
        }
    }

    async function reloadTable(sort?:boolean, range?:[number,number], fullclean?:boolean) {
        let localsort = sort == undefined? currentSort : sort
        let filteredcolumns: Record<string,string> = {}
        let localrange = range == undefined? tableRange : range
        if(fullclean){
            setCurrentSort(true)
            setCurrentFilters([])
            setTableRange([0,50])
            localsort = true
            localrange = [0,50]
        }else{
            currentFilters.forEach(filters => {
                filteredcolumns[filters.Column as keyof typeof filteredcolumns] = filters.Filter
            });
            console.log("sigma")
        }
        setLoading(true)
        try {
            const response = await fetch("//127.0.0.1/CRM/api/get_filtered_table.php", {
                method: "POST",
                body: JSON.stringify({
                    table: currentTable,
                    columns: filteredcolumns,
                    sort: localsort,
                    range: localrange,
                })
            })
            const data: TableQueryResult = await response.json()
            if (!response.ok || !data.success) {
                throw new Error(data?.error)
            }
            console.log(data)
            setDisplayTable(data.result)
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
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
                                    <Button variant="danger" onClick={() => reloadTable(undefined,undefined,true)}>Wyczyść Filtry</Button>
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
                                <Col>
                                    <Pagination>
                                        <Pagination.First />
                                        <Pagination.Prev />
                                        <Pagination.Item>{1}</Pagination.Item>
                                        <Pagination.Ellipsis />

                                        <Pagination.Item>{10}</Pagination.Item>
                                        <Pagination.Item>{11}</Pagination.Item>
                                        <Pagination.Item active>{12}</Pagination.Item>
                                        <Pagination.Item>{13}</Pagination.Item>
                                        <Pagination.Item>{14}</Pagination.Item>

                                        <Pagination.Ellipsis />
                                        <Pagination.Item>{20}</Pagination.Item>
                                        <Pagination.Next />
                                        <Pagination.Last />
                                    </Pagination>
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
